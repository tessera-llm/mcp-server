#!/usr/bin/env node
/**
 * CLI entry — `npx @tessera-llm/mcp-server`
 *
 * Reads TESSERA_API_KEY from env, optionally TESSERA_MCP_TRANSPORT (default:
 * stdio), TESSERA_MCP_PORT (default: 8788), TESSERA_MCP_HOST (default:
 * 127.0.0.1), and TESSERA_UPSTREAM_API_BASE_URL (default:
 * https://ledger.tesseraai.io).
 *
 * For stdio: a single SessionContext is bound at boot from TESSERA_API_KEY.
 * For http: TESSERA_API_KEY is the fallback for requests that arrive
 * without an Authorization header; requests with `Authorization: Bearer`
 * use that header's key instead.
 *
 * Exits 1 on missing auth or unknown transport so MCP clients surface the
 * error to the user.
 */

import { runHttpServer, runStdioServer } from './server.js';
import type { ServerConfig } from './types.js';

const apiKey = process.env.TESSERA_API_KEY;
if (!apiKey) {
  process.stderr.write(
    'tessera-mcp-server: TESSERA_API_KEY environment variable is required.\n' +
      '\n' +
      'Get a free key (60M tokens/month, no card) at https://tesseraai.io/dev\n',
  );
  process.exit(1);
}

const transport = (process.env.TESSERA_MCP_TRANSPORT as ServerConfig['transport']) ?? 'stdio';
const upstreamApiBaseUrl =
  process.env.TESSERA_UPSTREAM_API_BASE_URL ?? 'https://ledger.tesseraai.io';

const config: ServerConfig = {
  transport,
  apiKey,
  upstreamApiBaseUrl,
  httpPort: process.env.TESSERA_MCP_PORT
    ? Number.parseInt(process.env.TESSERA_MCP_PORT, 10)
    : 8788,
  httpHost: process.env.TESSERA_MCP_HOST ?? '127.0.0.1',
};

if (transport === 'stdio') {
  runStdioServer(config).catch((error: unknown) => {
    process.stderr.write(`tessera-mcp-server: fatal: ${(error as Error).message}\n`);
    process.exit(1);
  });
} else if (transport === 'http') {
  runHttpServer(config).catch((error: unknown) => {
    process.stderr.write(`tessera-mcp-server: fatal: ${(error as Error).message}\n`);
    process.exit(1);
  });
} else {
  process.stderr.write(`tessera-mcp-server: unknown transport "${transport}". Use stdio or http.\n`);
  process.exit(1);
}
