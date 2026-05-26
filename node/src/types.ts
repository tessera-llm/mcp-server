/**
 * Shared types for tessera-mcp-server.
 *
 * Auth context flows via AsyncLocalStorage per request — see auth.ts.
 * Tool argument schemas live next to each tool in tools/<tool>.ts (Zod).
 *
 * Identity model follows the Tessera dashboard's proxy_api_keys schema:
 * a key resolves to a clientId (the customer org / "workspace") and
 * optionally a workloadId (if the key is workload-scoped rather than
 * client-scoped). There is no user concept inside an API-key session.
 */

export interface SessionContext {
  apiKey: string;
  clientId: string;
  workloadId: string | null;
  plan: 'founding_pilot' | 'production' | 'sandbox';
  keyPrefix: string;
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
  httpHost?: string;
  /**
   * Boot-time API key. Used by stdio (single-session) and as a fallback for
   * HTTP requests that arrive without an Authorization header. HTTP requests
   * that DO carry Authorization: Bearer use that header's key instead.
   */
  apiKey: string;
  upstreamApiBaseUrl: string;
}
