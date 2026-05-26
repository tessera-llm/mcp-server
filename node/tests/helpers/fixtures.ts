import type { SessionContext } from '../../src/types.js';

/** Standard test session context — matches the real dashboard schema:
 * tk_-prefixed API key, client_id (the customer org), optional workload_id,
 * plan, and the 12-char key prefix that the dashboard uses for UI display.
 */
export const TEST_SESSION: SessionContext = {
  apiKey: 'tk_test_abcdef123456',
  clientId: 'cli_01HXKTM4Y7Z8A3B9D2E5F6G7H8',
  workloadId: null,
  plan: 'production',
  keyPrefix: 'tk_test_abcd',
};
