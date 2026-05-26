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
      family: 'compression',
      title: 'System-prompt compression on support-triage',
      description:
        'High repeat ratio on shared system prefix; compression yields lift without quality drop.',
      est_monthly_savings_usd_low: 120,
      est_monthly_savings_usd_mid: 180,
      est_monthly_savings_usd_high: 240,
      engineering_days: 0.5,
      reversibility: 'instant',
      output_quality_risk: 'low',
      status: 'open',
      priority: 1,
      created_at: '2026-05-26T01:00:00Z',
    },
  ],
  total_count: 1,
};

describe('tessera_get_recommendation_queue tool', () => {
  it('omits workload_id from query when arg is undefined and wraps title + description as untrusted', async () => {
    const calls = mockFetch({ status: 200, body: UPSTREAM_RESPONSE });

    const result = await runWithSession(session, () => getRecommendationQueue.handler({}, session));

    expect(result.total_count).toBe(1);
    expect(result.recommendations[0]!.title).toBe(
      '<tessera:untrusted>System-prompt compression on support-triage</tessera:untrusted>',
    );
    expect(result.recommendations[0]!.description).toBe(
      '<tessera:untrusted>High repeat ratio on shared system prefix; compression yields lift without quality drop.</tessera:untrusted>',
    );
    // Non-string / non-user-controlled fields stay untagged.
    expect(result.recommendations[0]!.recommendation_id).toBe('rec_01');
    expect(result.recommendations[0]!.priority).toBe(1);

    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe('/api/v1/recommendations/queue');
    expect(url.searchParams.get('workload_id')).toBeNull();
  });

  it('passes through null description without wrapping (avoids "<tessera:untrusted>null</tessera:untrusted>" pollution)', async () => {
    mockFetch({
      status: 200,
      body: {
        recommendations: [
          { ...UPSTREAM_RESPONSE.recommendations[0]!, description: null },
        ],
        total_count: 1,
      },
    });

    const result = await runWithSession(session, () => getRecommendationQueue.handler({}, session));
    expect(result.recommendations[0]!.description).toBeNull();
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
