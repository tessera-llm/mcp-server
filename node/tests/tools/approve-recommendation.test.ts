import { describe, expect, it } from 'vitest';
import { runWithSession } from '../../src/auth.js';
import { approveRecommendation } from '../../src/tools/approve-recommendation.js';
import { mockFetch } from '../helpers/mock-fetch.js';
import { TEST_SESSION } from '../helpers/fixtures.js';

const session = TEST_SESSION;

const UPSTREAM_RESPONSE = {
  recommendation_id: 'rec_abc',
  workload_id: 'wkl_01',
  mechanic_id: 'M3',
  previous_status: 'suggested' as const,
  new_status: 'active' as const,
  approved_at: '2026-05-26T01:00:00Z',
  approved_by_user_id: 'usr_yevheny',
  audit_event_id: 'aud_01HXKTM4Y7Z8A3B9D2E5F6G7HX',
};

describe('tessera_approve_recommendation tool (mutate)', () => {
  it('POSTs to /api/v1/recommendations/<id>/approve with body merged from session', async () => {
    const calls = mockFetch({ status: 200, body: UPSTREAM_RESPONSE });

    const result = await runWithSession(session, () =>
      approveRecommendation.handler(
        { recommendation_id: 'rec_abc', approval_note: 'looks good — promote' },
        session,
      ),
    );

    expect(result).toEqual(UPSTREAM_RESPONSE);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.url).toBe('https://ledger.tesseraai.io/api/v1/recommendations/rec_abc/approve');
    expect(calls[0]?.body).toEqual({
      approval_note: 'looks good — promote',
      source: 'mcp-server',
    });
  });

  it('url-encodes a recommendation id containing reserved characters', async () => {
    const calls = mockFetch({ status: 200, body: UPSTREAM_RESPONSE });

    await runWithSession(session, () =>
      approveRecommendation.handler({ recommendation_id: 'rec/with slash' }, session),
    );

    expect(calls[0]?.url).toBe(
      'https://ledger.tesseraai.io/api/v1/recommendations/rec%2Fwith%20slash/approve',
    );
  });

  it('passes null when approval_note is omitted (audit row still records the approval)', async () => {
    const calls = mockFetch({ status: 200, body: UPSTREAM_RESPONSE });

    await runWithSession(session, () =>
      approveRecommendation.handler({ recommendation_id: 'rec_abc' }, session),
    );

    expect(calls[0]?.body).toEqual({
      approval_note: null,
      source: 'mcp-server',
    });
  });

  it('rejects an approval_note exceeding 500 chars', () => {
    const tooLong = 'x'.repeat(501);
    expect(() =>
      approveRecommendation.inputSchema.parse({
        recommendation_id: 'rec_abc',
        approval_note: tooLong,
      }),
    ).toThrow();
  });

  it('surfaces 409 conflict with a recognisable message', async () => {
    mockFetch({ status: 409, body: { error: 'already_active' } });

    await expect(
      runWithSession(session, () =>
        approveRecommendation.handler({ recommendation_id: 'rec_abc' }, session),
      ),
    ).rejects.toThrow(/Recommendation is no longer in open state/);
  });

  it('exposes the public tool name (the only mutating tool in v0.1)', () => {
    expect(approveRecommendation.name).toBe('tessera_approve_recommendation');
    expect(approveRecommendation.description).toMatch(/ONLY MUTATING TOOL/i);
  });
});
