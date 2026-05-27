import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
    // CI Ubuntu runners take longer for the first Express `app.listen(0,
    // '127.0.0.1', cb)` bind in `tests/http-transport.test.ts` — enough to
    // push past the vitest default 5000ms on some of the lifecycle-heavy
    // tests. Locally the full file passes in ~70ms. Bumping testTimeout +
    // hookTimeout to 15000ms is a CI-environment accommodation; the
    // in-test work itself is sub-100ms once bind completes.
    testTimeout: 15000,
    hookTimeout: 15000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/cli.ts'],
      reporter: ['text', 'json-summary'],
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
