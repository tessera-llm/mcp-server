import { describe, expect, it } from 'vitest';
import { validateApiKey, getCurrentSession, runWithSession } from '../src/auth.js';
import { mockFetch } from './helpers/mock-fetch.js';

const VALID_KEY_RESPONSE = {
  client_id: 'cli_01HXKTM4Y7Z8A3B9D2E5F6G7H8',
  workload_id: null,
  plan: 'production',
  key_prefix: 'tk_abc12345',
};

describe('validateApiKey', () => {
  it('rejects keys without tk_ prefix before any network call', async () => {
    mockFetch({ status: 200, body: VALID_KEY_RESPONSE });
    await expect(validateApiKey('not_a_real_key', 'https://ledger.tesseraai.io')).rejects.toThrow(
      /Invalid API key format/,
    );
  });

  it('returns a SessionContext on a 200 response', async () => {
    const calls = mockFetch({ status: 200, body: VALID_KEY_RESPONSE });
    const session = await validateApiKey('tk_abc12345xyz', 'https://ledger.tesseraai.io');

    expect(session).toEqual({
      apiKey: 'tk_abc12345xyz',
      clientId: VALID_KEY_RESPONSE.client_id,
      workloadId: null,
      plan: 'production',
      keyPrefix: VALID_KEY_RESPONSE.key_prefix,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://ledger.tesseraai.io/api/internal/validate-key');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers.authorization).toBe('Bearer tk_abc12345xyz');
    expect(calls[0]?.body).toEqual({ source: 'mcp-server' });
  });

  it('throws a recognisable error on 401', async () => {
    mockFetch({ status: 401, body: { error: 'invalid_key' } });
    await expect(validateApiKey('tk_revoked', 'https://ledger.tesseraai.io')).rejects.toThrow(
      /API key invalid or revoked/,
    );
  });

  it('throws on 5xx with the upstream status code surfaced', async () => {
    mockFetch({ status: 503, body: { error: 'unavailable' } });
    await expect(validateApiKey('tk_xyz', 'https://ledger.tesseraai.io')).rejects.toThrow(/503/);
  });
});

describe('AsyncLocalStorage session context', () => {
  it('makes the session available to handlers via getCurrentSession', async () => {
    const session = {
      apiKey: 'tk_test',
      clientId: 'cli_x',
      workloadId: null,
      plan: 'sandbox' as const,
      keyPrefix: 'tk_test_abcd',
    };

    const observed = await runWithSession(session, async () => getCurrentSession());
    expect(observed).toBe(session);
  });

  it('throws when getCurrentSession is called outside a session', () => {
    expect(() => getCurrentSession()).toThrow(/No session context/);
  });
});
