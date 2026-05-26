import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { runWithSession, validateApiKey } from './auth.js';
import { tools } from './tools/index.js';
import type { ServerConfig, SessionContext, ToolDefinition } from './types.js';

const PACKAGE_NAME = '@tessera-llm/mcp-server';
const PACKAGE_VERSION = '0.1.0-alpha.0';

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
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );
}

export async function createServer(config: ServerConfig): Promise<McpServer> {
  const session = await validateApiKey(config.apiKey, config.upstreamApiBaseUrl);

  const server = new McpServer({
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
  });

  for (const tool of tools as ReadonlyArray<ToolDefinition<unknown, unknown>>) {
    registerToolOnServer(server, tool, session);
  }

  return server;
}

export async function runStdioServer(config: ServerConfig): Promise<void> {
  const server = await createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
