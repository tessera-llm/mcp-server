import { afterEach, beforeEach } from 'vitest';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Each test installs its own fetch mock via vi.stubGlobal('fetch', ...). Reset between tests so leaks
  // between cases surface immediately. Tests that need the real fetch can opt out with restoreFetch().
  globalThis.fetch = (async () => {
    throw new Error('Unmocked fetch call. Each test must install a fetch mock via vi.stubGlobal.');
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

export function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

/**
 * Platform-native fetch captured at module load, before the per-test
 * throw-stub is installed. Used by `mockFetch` when a URL-filtered mock
 * needs to fall through for URLs it does not intercept (e.g. the test
 * driver's outbound HTTP to an in-process test server).
 */
export const realPlatformFetch = originalFetch;
