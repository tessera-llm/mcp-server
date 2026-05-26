/**
 * Library entry — re-exports the public surface so users can:
 *   import { createServer, runStdioServer } from '@tessera-llm/mcp-server';
 *
 * For CLI usage (npx @tessera-llm/mcp-server), see cli.ts.
 */

export { createServer, runStdioServer } from './server.js';
export type { ServerConfig, SessionContext, Transport } from './types.js';
