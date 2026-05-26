#!/usr/bin/env node
/**
 * CLI entry — `npx @tessera-llm/mcp-server`
 *
 * Reads TESSERA_API_KEY from env, optionally TESSERA_MCP_TRANSPORT (default: stdio)
 * and TESSERA_UPSTREAM_API_BASE_URL (default: https://ledger.tesseraai.io).
 *
 * Exits 1 on missing/invalid auth so MCP clients surface the error to the user.
 */

import { runStdioServer } from './server.js';
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
};

if (transport === 'stdio') {
  runStdioServer(config).catch((error: unknown) => {
    process.stderr.write(`tessera-mcp-server: fatal: ${(error as Error).message}\n`);
    process.exit(1);
  });
} else if (transport === 'http') {
  // TODO v0.1: Streamable HTTP transport — Express + StreamableHTTPServerTransport from @modelcontextprotocol/sdk.
  // Scaffolded in next session per spec § 4.
  process.stderr.write(
    'tessera-mcp-server: HTTP transport is not yet implemented in v0.1.0-alpha.0. ' +
      'Use stdio (default) for now.\n',
  );
  process.exit(1);
} else {
  process.stderr.write(`tessera-mcp-server: unknown transport "${transport}". Use stdio or http.\n`);
  process.exit(1);
}
