import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import express, { type Express, type Request, type Response } from 'express';
import type { Server as HttpServer } from 'node:http';
import { z } from 'zod';
import { runWithSession, validateApiKey } from './auth.js';
import { tools } from './tools/index.js';
import type { ServerConfig, SessionContext, ToolDefinition } from './types.js';
import { UNTRUSTED_PREAMBLE } from './untrusted.js';

const PACKAGE_NAME = '@tessera-llm/mcp-server';
const PACKAGE_VERSION = '0.1.3';

function registerToolOnServer<TArgs, TResult>(
  server: McpServer,
  tool: ToolDefinition<TArgs, TResult>,
  session: SessionContext,
): void {
  const shape = (tool.inputSchema as unknown as z.ZodObject<z.ZodRawShape>).shape;
  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: shape,
    },
    async (rawArgs: unknown) => {
      const args = tool.inputSchema.parse(rawArgs);
      const result = await runWithSession(session, () => tool.handler(args, session));
      return {
        content: [
          {
            type: 'text' as const,
            text: UNTRUSTED_PREAMBLE,
          },
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );
}

/**
 * Build a McpServer bound to a pre-validated session. Public so the HTTP
 * transport (which validates auth per request) can mint a fresh server
 * for each incoming request without re-running upstream validation.
 */
export function buildServer(session: SessionContext): McpServer {
  const server = new McpServer({
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
  });
  for (const tool of tools as ReadonlyArray<ToolDefinition<unknown, unknown>>) {
    registerToolOnServer(server, tool, session);
  }
  return server;
}

export async function createServer(config: ServerConfig): Promise<McpServer> {
  const session = await validateApiKey(config.apiKey, config.upstreamApiBaseUrl);
  return buildServer(session);
}

export async function runStdioServer(config: ServerConfig): Promise<void> {
  const server = await createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/**
 * Parse a `Bearer <token>` Authorization header. Returns null if absent or
 * malformed. Empty token after the prefix counts as malformed.
 */
export function parseBearer(header: string | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return null;
  const token = m[1]!.trim();
  return token.length > 0 ? token : null;
}

const AUTH_ERROR_RESPONSE = {
  jsonrpc: '2.0' as const,
  error: {
    code: -32001,
    message:
      'Authorization required. Send Authorization: Bearer tk_<your-key>. Get a free key at https://tesseraai.io/dev.',
  },
  id: null,
};

/**
 * Build the Express app for the HTTP transport. Exported so tests can drive
 * it via supertest-style request injection without binding a real port.
 *
 * Each POST /mcp request:
 *   1. validates the Authorization: Bearer header against the upstream
 *      dashboard's /api/internal/validate-key endpoint
 *   2. mints a fresh McpServer + StreamableHTTPServerTransport pair in
 *      stateless mode (sessionIdGenerator: undefined)
 *   3. wires them together and hands the request off to the transport
 *   4. closes both when the response stream ends
 *
 * GET and DELETE on /mcp return 405 — stateless mode does not maintain
 * sessions for resumability or session deletion.
 */
export function createHttpApp(config: ServerConfig): Express {
  const host = config.httpHost ?? '127.0.0.1';
  const app = createMcpExpressApp({ host });
  app.use(express.json({ limit: '4mb' }));

  app.post('/mcp', async (req: Request, res: Response) => {
    const headerKey = parseBearer(req.headers.authorization);
    const apiKey = headerKey ?? config.apiKey;
    if (!apiKey) {
      res.status(401).json(AUTH_ERROR_RESPONSE);
      return;
    }

    let session: SessionContext;
    try {
      session = await validateApiKey(apiKey, config.upstreamApiBaseUrl);
    } catch (err) {
      const msg = (err as Error).message;
      const status =
        msg.includes('Invalid API key format') ||
        msg.includes('invalid or revoked')
          ? 401
          : 502;
      res.status(status).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: msg },
        id: null,
      });
      return;
    }

    const server = buildServer(session);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      void transport.close().catch(() => {});
      void server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await runWithSession(session, () => transport.handleRequest(req, res, req.body));
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: (err as Error).message },
          id: null,
        });
      }
    }
  });

  // Stateless mode — no session-keyed GET resumption or DELETE termination.
  app.get('/mcp', (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method Not Allowed — stateless transport.' },
      id: null,
    });
  });
  app.delete('/mcp', (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method Not Allowed — stateless transport.' },
      id: null,
    });
  });

  // Liveness probe — separate from /mcp so platforms can health-check
  // without needing an API key.
  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, server: PACKAGE_NAME, version: PACKAGE_VERSION });
  });

  return app;
}

export async function runHttpServer(config: ServerConfig): Promise<HttpServer> {
  const port = config.httpPort ?? 8788;
  const host = config.httpHost ?? '127.0.0.1';
  const app = createHttpApp(config);
  return new Promise((resolve) => {
    const httpServer = app.listen(port, host, () => {
      process.stderr.write(
        `tessera-mcp-server: HTTP transport listening on http://${host}:${port}/mcp\n`,
      );
      resolve(httpServer);
    });
  });
}
