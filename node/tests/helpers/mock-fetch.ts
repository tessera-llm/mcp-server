import { vi } from 'vitest';

export interface MockedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface MockFetchOptions {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  /**
   * Only intercept fetch calls whose URL matches this predicate. Anything
   * else falls through to the real fetch — useful when a test spins up an
   * in-process HTTP server and needs to mock outbound calls FROM that
   * server without intercepting the inbound test-driver calls TO it.
   * Default: intercept every call.
   */
  matchUrl?: (url: string) => boolean;
}

/**
 * Install a fetch mock that returns the given options. Returns an array that records
 * every call made to fetch during the test — handy for asserting URL, method, body.
 */
export function mockFetch(options: MockFetchOptions = {}): MockedRequest[] {
  const calls: MockedRequest[] = [];

  const fakeFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (options.matchUrl && !options.matchUrl(url)) {
      // Fall through to the platform native fetch captured in setup.ts —
      // exposed via `restoreFetch()` so we don't accidentally fall back to
      // the per-test throw-stub.
      const { realPlatformFetch } = await import('../setup.js');
      return realPlatformFetch(input as RequestInfo, init);
    }
    const method = (init?.method ?? 'GET').toUpperCase();
    // HTTP headers are case-insensitive — normalise keys to lowercase so tests
    // can assert against `headers.authorization` regardless of how the caller cased it.
    const headers: Record<string, string> = {};
    if (init?.headers) {
      const h = init.headers;
      if (h instanceof Headers) {
        h.forEach((value, key) => {
          headers[key.toLowerCase()] = value;
        });
      } else if (Array.isArray(h)) {
        for (const [k, v] of h) headers[k.toLowerCase()] = v;
      } else {
        for (const [k, v] of Object.entries(h)) headers[k.toLowerCase()] = v;
      }
    }
    let body: unknown = undefined;
    if (init?.body && typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    calls.push({ url, method, headers, body });

    const status = options.status ?? 200;
    const responseBody = options.body ?? {};
    return new Response(JSON.stringify(responseBody), {
      status,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  });

  vi.stubGlobal('fetch', fakeFetch);
  return calls;
}
