import { describe, expect, it } from 'vitest';
import { validateApiKey, getCurrentSession, runWithSession } from '../src/auth.js';
import { mockFetch } from './helpers/mock-fetch.js';

const VALID_KEY_RESPONSE = {
  user_id: 'usr_01HXKTM4Y7Z8A3B9D2E5F6G7H8',
  workspace_id: 'wks_01HXKTM4Y7Z8A3B9D2E5F6G7H9',
  project_id: 'prj_01HXKTM4Y7Z8A3B9D2E5F6G7HA',
  plan_tier: 'production',
};

describe('validateApiKey', () => {
  it('rejects keys without tk_live_ or tk_test_ prefix before any network call', async () => {
    mockFetch({ status: 200, body: VALID_KEY_RESPONSE });
    await expect(validateApiKey('not_a_real_key', 'https://ledger.tesseraai.io')).rejects.toThrow(
      /Invalid API key format/,
    );
  });

  it('returns a SessionContext on a 200 response', async () => {
    const calls = mockFetch({ status: 200, body: VALID_KEY_RESPONSE });
    const session = await validateApiKey('tk_live_abc123', 'https://ledger.tesseraai.io');

    expect(session).toEqual({
      apiKey: 'tk_live_abc123',
      userId: VALID_KEY_RESPONSE.user_id,
      workspaceId: VALID_KEY_RESPONSE.workspace_id,
      projectId: VALID_KEY_RESPONSE.project_id,
      planTier: 'production',
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://ledger.tesseraai.io/api/internal/validate-key');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers.authorization).toBe('Bearer tk_live_abc123');
    expect(calls[0]?.body).toEqual({ source: 'mcp-server' });
  });

  it('throws a recognisable error on 401', async () => {
    mockFetch({ status: 401, body: { error: 'invalid_key' } });
    await expect(validateApiKey('tk_live_revoked', 'https://ledger.tesseraai.io')).rejects.toThrow(
      /API key invalid or revoked/,
    );
  });

  it('throws on 5xx with the upstream status code surfaced', async () => {
    mockFetch({ status: 503, body: { error: 'unavailable' } });
    await expect(validateApiKey('tk_live_xyz', 'https://ledger.tesseraai.io')).rejects.toThrow(/503/);
  });
});

describe('AsyncLocalStorage session context', () => {
  it('makes the session available to handlers via getCurrentSession', async () => {
    const session = {
      apiKey: 'tk_live_test',
      userId: 'usr_x',
      workspaceId: 'wks_x',
      projectId: 'prj_x',
      planTier: 'sandbox' as const,
    };

    const observed = await runWithSession(session, async () => getCurrentSession());
    expect(observed).toBe(session);
  });

  it('throws when getCurrentSession is called outside a session', () => {
    expect(() => getCurrentSession()).toThrow(/No session context/);
  });
});
