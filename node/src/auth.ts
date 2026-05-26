import { AsyncLocalStorage } from 'node:async_hooks';
import type { SessionContext } from './types.js';

const sessionStore = new AsyncLocalStorage<SessionContext>();

export function getCurrentSession(): SessionContext {
  const ctx = sessionStore.getStore();
  if (!ctx) {
    throw new Error('No session context — auth middleware did not run before tool handler.');
  }
  return ctx;
}

export function runWithSession<T>(ctx: SessionContext, fn: () => Promise<T>): Promise<T> {
  return sessionStore.run(ctx, fn);
}

/**
 * Validate an API key against the upstream dashboard.
 *
 * Returns the SessionContext the key resolves to, or throws on
 * malformed / invalid / revoked keys.
 *
 * Endpoint contract — POST {upstreamBaseUrl}/api/internal/validate-key
 *   Headers: Authorization: Bearer tk_<...>
 *   Body:    { source: "mcp-server" }
 *   200 →    { client_id, workload_id, plan, key_prefix }
 *   401/403 → key invalid or revoked
 *   5xx →    upstream unavailable
 *
 * Dashboard-side route lives at dashboard/app/api/internal/validate-key/route.ts.
 * Hashes Authorization bearer with SHA-256 and looks up proxy_api_keys.
 */
export async function validateApiKey(
  apiKey: string,
  upstreamBaseUrl: string,
): Promise<SessionContext> {
  if (!apiKey.startsWith('tk_')) {
    throw new Error('Invalid API key format. Expected tk_<token>.');
  }

  const url = `${upstreamBaseUrl}/api/internal/validate-key`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ source: 'mcp-server' }),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('API key invalid or revoked. Get a new one at https://tesseraai.io/dev.');
  }
  if (!response.ok) {
    throw new Error(`Auth upstream returned ${response.status}. Try again or check status.tesseraai.io.`);
  }

  const data = (await response.json()) as {
    client_id: string;
    workload_id: string | null;
    plan: SessionContext['plan'];
    key_prefix: string;
  };

  return {
    apiKey,
    clientId: data.client_id,
    workloadId: data.workload_id,
    plan: data.plan,
    keyPrefix: data.key_prefix,
  };
}
