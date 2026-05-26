import type { SessionContext } from './types.js';

/**
 * Shared upstream-fetch helper for all tool handlers.
 *
 * Extracts the GET/POST + Authorization + status-code-to-error boilerplate
 * so each tool file only declares its endpoint path, query params, body, and
 * result shape.
 *
 * Default base URL: https://ledger.tesseraai.io
 * Override with TESSERA_UPSTREAM_API_BASE_URL env var (used by tests + staging).
 *
 * NOTE: The /api/v1/* endpoints these tools call do NOT yet exist on the
 * dashboard at this scaffold's commit (2026-05-26). They must be implemented
 * dashboard-side BEFORE this MCP server is published to npm. See Task #11
 * in the parent session and spec § "v0.1 prerequisite — dashboard wiring".
 */

const DEFAULT_BASE_URL = 'https://ledger.tesseraai.io';

function getBaseUrl(): string {
  return process.env.TESSERA_UPSTREAM_API_BASE_URL ?? DEFAULT_BASE_URL;
}

export interface UpstreamGetOptions {
  path: string;
  query?: Record<string, string>;
  ctx: SessionContext;
}

export interface UpstreamPostOptions {
  path: string;
  body: Record<string, unknown>;
  ctx: SessionContext;
  /** HTTP status codes that should throw a more specific error than the generic upstream-failed message. */
  knownErrors?: Record<number, string>;
}

async function handleResponse<T>(response: Response, path: string, knownErrors?: Record<number, string>): Promise<T> {
  if (knownErrors && response.status in knownErrors) {
    throw new Error(knownErrors[response.status]);
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Upstream ${response.status} for ${path}: ${body.slice(0, 500)}`);
  }
  return (await response.json()) as T;
}

export async function upstreamGet<T>(opts: UpstreamGetOptions): Promise<T> {
  const url = new URL(`${getBaseUrl()}${opts.path}`);
  url.searchParams.set('project_id', opts.ctx.projectId);
  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      url.searchParams.set(key, value);
    }
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${opts.ctx.apiKey}`,
      Accept: 'application/json',
    },
  });
  return handleResponse<T>(response, opts.path);
}

export async function upstreamPost<T>(opts: UpstreamPostOptions): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${opts.path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.ctx.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ ...opts.body, project_id: opts.ctx.projectId, source: 'mcp-server' }),
  });
  return handleResponse<T>(response, opts.path, opts.knownErrors);
}
