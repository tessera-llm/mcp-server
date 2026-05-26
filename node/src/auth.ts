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
 * Validate an API key against the upstream dashboard API.
 * Returns the SessionContext the key resolves to, or throws on invalid/expired/revoked.
 *
 * v0.1 implementation calls https://ledger.tesseraai.io/api/internal/validate-key
 * which short-lived caches the result for 60s (per dashboard auth pattern).
 */
export async function validateApiKey(
  apiKey: string,
  upstreamBaseUrl: string,
): Promise<SessionContext> {
  if (!apiKey.startsWith('tk_live_') && !apiKey.startsWith('tk_test_')) {
    throw new Error('Invalid API key format. Expected tk_live_* or tk_test_*.');
  }

  // NOTE: /api/internal/validate-key does not yet exist on dashboard at scaffold commit (2026-05-26).
  // Must be implemented BEFORE publish — see Task #11 prerequisite. Endpoint contract:
  //   POST { source: 'mcp-server' } with Authorization: Bearer tk_live_*
  //   → 200 { user_id, workspace_id, project_id, plan_tier }
  //   → 401/403 if key invalid/revoked
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
    user_id: string;
    workspace_id: string;
    project_id: string;
    plan_tier: SessionContext['planTier'];
  };

  return {
    apiKey,
    userId: data.user_id,
    workspaceId: data.workspace_id,
    projectId: data.project_id,
    planTier: data.plan_tier,
  };
}
