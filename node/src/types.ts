/**
 * Shared types for tessera-mcp-server.
 *
 * Auth context flows via AsyncLocalStorage per request — see auth.ts.
 * Tool argument schemas live next to each tool in tools/<tool>.ts (Zod).
 */

export interface SessionContext {
  apiKey: string;
  userId: string;
  workspaceId: string;
  projectId: string;
  planTier: 'sandbox' | 'production' | 'legacy_pilot';
}

export interface ToolDefinition<TArgs, TResult> {
  name: string;
  description: string;
  inputSchema: import('zod').ZodType<TArgs, import('zod').ZodTypeDef, unknown>;
  handler: (args: TArgs, ctx: SessionContext) => Promise<TResult>;
}

export type Transport = 'stdio' | 'http';

export interface ServerConfig {
  transport: Transport;
  httpPort?: number;
  apiKey: string;
  upstreamApiBaseUrl: string;
}
