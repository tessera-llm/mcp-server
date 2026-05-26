import { beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { parseBearer, runHttpServer } from '../src/server.js';
import { mockFetch } from './helpers/mock-fetch.js';
import { restoreFetch } from './setup.js';
import { TEST_SESSION } from './helpers/fixtures.js';
import type { ServerConfig } from '../src/types.js';

/**
 * Match only the upstream validate-key URL. The test driver itself uses
 * fetch() to drive the local server — those outbound calls fall through
 * to the real platform fetch.
 */
const matchValidateKey = (url: string): boolean =>
  url.includes('/api/internal/validate-key');

// Tests in this file drive a real HTTP server via global fetch. The
// per-test throw-stub from setup.ts would block those test-driver calls,
// so we restore the platform fetch first. Per-test mockFetch installs
// then re-stub it with URL-scoped routing.
beforeEach(() => {
  restoreFetch();
});

const BASE_CONFIG: ServerConfig = {
  transport: 'http',
  apiKey: 'tk_boot_only',
  upstreamApiBaseUrl: 'https://ledger.tesseraai.io',
  httpPort: 0,
  httpHost: '127.0.0.1',
};

function validateKeyOkBody() {
  return {
    client_id: TEST_SESSION.clientId,
    workload_id: TEST_SESSION.workloadId,
    plan: TEST_SESSION.plan,
    key_prefix: TEST_SESSION.keyPrefix,
  };
}

async function startServerForTest(config: ServerConfig = BASE_CONFIG): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const httpServer = await runHttpServer(config);
  const addr = httpServer.address() as AddressInfo;
  return {
    url: `http://${addr.address}:${addr.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

describe('parseBearer', () => {
  it('returns the token from a well-formed Bearer header', () => {
    expect(parseBearer('Bearer tk_live_abc')).toBe('tk_live_abc');
  });

  it('case-insensitive on the Bearer scheme', () => {
    expect(parseBearer('bearer tk_live_abc')).toBe('tk_live_abc');
    expect(parseBearer('BEARER tk_live_abc')).toBe('tk_live_abc');
  });

  it('null on missing header', () => {
    expect(parseBearer(undefined)).toBeNull();
  });

  it('null on non-Bearer auth schemes', () => {
    expect(parseBearer('Basic dXNlcjpwYXNz')).toBeNull();
  });

  it('null on empty token after Bearer', () => {
    expect(parseBearer('Bearer ')).toBeNull();
    expect(parseBearer('Bearer    ')).toBeNull();
  });
});

describe('createHttpApp — route shape', () => {
  it('GET /healthz returns 200 with server identity (no auth required)', async () => {
    const { url, close } = await startServerForTest();
    try {
      const res = await fetch(`${url}/healthz`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; server: string; version: string };
      expect(body.ok).toBe(true);
      expect(body.server).toBe('@tessera-llm/mcp-server');
      expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
    } finally {
      await close();
    }
  });

  it('GET /mcp returns 405 (stateless transport, no session resumption)', async () => {
    const { url, close } = await startServerForTest();
    try {
      const res = await fetch(`${url}/mcp`);
      expect(res.status).toBe(405);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toMatch(/stateless/i);
    } finally {
      await close();
    }
  });

  it('DELETE /mcp returns 405 (stateless transport, no session deletion)', async () => {
    const { url, close } = await startServerForTest();
    try {
      const res = await fetch(`${url}/mcp`, { method: 'DELETE' });
      expect(res.status).toBe(405);
    } finally {
      await close();
    }
  });
});

describe('createHttpApp — auth gating on POST /mcp', () => {
  it('401 when no Authorization header AND no boot fallback key', async () => {
    const { url, close } = await startServerForTest({ ...BASE_CONFIG, apiKey: '' });
    try {
      const res = await fetch(`${url}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toMatch(/Authorization required/);
    } finally {
      await close();
    }
  });

  it('401 when the API key is malformed (does not start with tk_)', async () => {
    const { url, close } = await startServerForTest();
    try {
      const res = await fetch(`${url}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer not-a-tessera-key',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      expect(res.status).toBe(401);
    } finally {
      await close();
    }
  });

  it('401 when upstream validate-key returns 401', async () => {
    mockFetch({ status: 401, body: { error: 'revoked' }, matchUrl: matchValidateKey });
    const { url, close } = await startServerForTest();
    try {
      const res = await fetch(`${url}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer tk_revoked_key',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toMatch(/invalid or revoked/);
    } finally {
      await close();
    }
  });

  it('502 when upstream validate-key is unreachable', async () => {
    mockFetch({ status: 503, body: 'upstream down', matchUrl: matchValidateKey });
    const { url, close } = await startServerForTest();
    try {
      const res = await fetch(`${url}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer tk_test_abcdef123456',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      expect(res.status).toBe(502);
    } finally {
      await close();
    }
  });

  it('accepts auth and dispatches to the MCP transport (no 401 / 502) on a valid key', async () => {
    mockFetch({ status: 200, body: validateKeyOkBody(), matchUrl: matchValidateKey });
    const { url, close } = await startServerForTest();
    try {
      // Spec-compliant initialize: streamable-http expects Accept to include
      // both application/json and text/event-stream, even for a single-shot
      // POST that does not switch to SSE.
      const res = await fetch(`${url}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          Authorization: 'Bearer tk_test_abcdef123456',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: { name: 'tessera-mcp-test', version: '0.0.0' },
          },
        }),
      });
      // Auth passed if status is neither 401 nor 502. The actual transport
      // status varies (200, 202, etc) depending on SDK version — what we
      // care about here is that the request reached the transport.
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(502);
      expect(res.status).toBeLessThan(500);
    } finally {
      await close();
    }
  });
});
