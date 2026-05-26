import { describe, expect, it } from 'vitest';
import { upstreamGet, upstreamPost } from '../src/upstream.js';
import { mockFetch } from './helpers/mock-fetch.js';
import { TEST_SESSION } from './helpers/fixtures.js';

const session = TEST_SESSION;

describe('upstreamGet', () => {
  it('prepends base URL, passes query params, and sends the bearer token', async () => {
    const calls = mockFetch({ status: 200, body: { ok: true } });

    await upstreamGet({
      path: '/api/v1/savings-report',
      query: { workload_id: 'wkl_42', window: '30d' },
      ctx: session,
    });

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]!.url);
    expect(url.origin).toBe('https://ledger.tesseraai.io');
    expect(url.pathname).toBe('/api/v1/savings-report');
    expect(url.searchParams.get('workload_id')).toBe('wkl_42');
    expect(url.searchParams.get('window')).toBe('30d');
    expect(url.searchParams.get('client_id')).toBeNull();
    expect(calls[0]?.headers.authorization).toBe(`Bearer ${session.apiKey}`);
  });

  it('surfaces 5xx as an error including the status code', async () => {
    mockFetch({ status: 502, body: 'upstream timed out' });
    await expect(
      upstreamGet({ path: '/api/v1/workloads', ctx: session }),
    ).rejects.toThrow(/502.*api\/v1\/workloads/);
  });

  it('honours TESSERA_UPSTREAM_API_BASE_URL env override', async () => {
    const calls = mockFetch({ status: 200, body: { ok: true } });
    const originalBaseUrl = process.env.TESSERA_UPSTREAM_API_BASE_URL;
    process.env.TESSERA_UPSTREAM_API_BASE_URL = 'http://localhost:4001';

    try {
      await upstreamGet({ path: '/api/v1/workloads', ctx: session });
      expect(calls[0]?.url.startsWith('http://localhost:4001/api/v1/workloads')).toBe(true);
    } finally {
      if (originalBaseUrl === undefined) {
        delete process.env.TESSERA_UPSTREAM_API_BASE_URL;
      } else {
        process.env.TESSERA_UPSTREAM_API_BASE_URL = originalBaseUrl;
      }
    }
  });
});

describe('upstreamPost', () => {
  it('sends JSON body merged with the source marker but no scope id (the bearer token scopes)', async () => {
    const calls = mockFetch({ status: 200, body: { ok: true } });

    await upstreamPost({
      path: '/api/v1/recommendations/rec_abc/approve',
      body: { approval_note: 'looks good' },
      ctx: session,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['content-type']).toBe('application/json');
    expect(calls[0]?.body).toEqual({
      approval_note: 'looks good',
      source: 'mcp-server',
    });
  });

  it('maps a knownErrors status to its custom message', async () => {
    mockFetch({ status: 409, body: { error: 'conflict' } });

    await expect(
      upstreamPost({
        path: '/api/v1/recommendations/rec_abc/approve',
        body: {},
        ctx: session,
        knownErrors: { 409: 'Already approved.' },
      }),
    ).rejects.toThrow('Already approved.');
  });
});
