import { describe, expect, it } from 'vitest';
import { runWithSession } from '../../src/auth.js';
import { getRecommendationQueue } from '../../src/tools/get-recommendation-queue.js';
import { mockFetch } from '../helpers/mock-fetch.js';
import { TEST_SESSION } from '../helpers/fixtures.js';

const session = TEST_SESSION;

const UPSTREAM_RESPONSE = {
  recommendations: [
    {
      recommendation_id: 'rec_01',
      workload_id: 'wkl_01',
      workload_name: 'support-triage',
      mechanic_id: 'M3',
      mechanic_label: 'System-prompt compression',
      expected_lift_pct: 12.4,
      confidence: 0.92,
      sample_size: 4321,
      proposed_at: '2026-05-26T01:00:00Z',
      rationale: 'High repeat ratio on shared system prefix; compression yields lift without quality drop.',
    },
  ],
  total_count: 1,
};

describe('tessera_get_recommendation_queue tool', () => {
  it('omits workload_id from query when arg is undefined', async () => {
    const calls = mockFetch({ status: 200, body: UPSTREAM_RESPONSE });

    const result = await runWithSession(session, () => getRecommendationQueue.handler({}, session));

    expect(result).toEqual(UPSTREAM_RESPONSE);
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe('/api/v1/recommendations/queue');
    expect(url.searchParams.get('workload_id')).toBeNull();
  });

  it('passes workload_id query when provided', async () => {
    const calls = mockFetch({ status: 200, body: UPSTREAM_RESPONSE });

    await runWithSession(session, () =>
      getRecommendationQueue.handler({ workload_id: 'wkl_01' }, session),
    );

    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get('workload_id')).toBe('wkl_01');
  });

  it('exposes the public tool name', () => {
    expect(getRecommendationQueue.name).toBe('tessera_get_recommendation_queue');
  });
});
