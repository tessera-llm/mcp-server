import { describe, expect, it } from 'vitest';
import { runWithSession } from '../../src/auth.js';
import { getQualitySnapshot } from '../../src/tools/get-quality-snapshot.js';
import { mockFetch } from '../helpers/mock-fetch.js';
import type { SessionContext } from '../../src/types.js';

const session: SessionContext = {
  apiKey: 'tk_live_test',
  userId: 'usr_x',
  workspaceId: 'wks_x',
  projectId: 'prj_fixture',
  planTier: 'production',
};

const UPSTREAM_RESPONSE = {
  workload_id: 'wkl_01',
  window: '7d',
  sla_floor: 0.95,
  p50_quality_score: 0.972,
  p95_quality_score: 0.943,
  composition_cap_active: true,
  drift_events: [
    {
      detected_at: '2026-05-24T17:30:00Z',
      metric: 'p95_score' as const,
      expected: 0.95,
      observed: 0.91,
      action_taken: 'auto_rollback' as const,
    },
  ],
  measured_samples: 1842,
  as_of: '2026-05-26T00:00:00Z',
};

describe('tessera_get_quality_snapshot tool', () => {
  it('passes workload_id + window and returns parsed body', async () => {
    const calls = mockFetch({ status: 200, body: UPSTREAM_RESPONSE });

    const result = await runWithSession(session, () =>
      getQualitySnapshot.handler({ workload_id: 'wkl_01', window: '7d' }, session),
    );

    expect(result).toEqual(UPSTREAM_RESPONSE);
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe('/api/v1/quality/snapshot');
    expect(url.searchParams.get('workload_id')).toBe('wkl_01');
    expect(url.searchParams.get('window')).toBe('7d');
  });

  it('defaults window to 30d when omitted', () => {
    const parsed = getQualitySnapshot.inputSchema.parse({ workload_id: 'wkl_01' });
    expect(parsed.window).toBe('30d');
  });

  it('exposes the public tool name', () => {
    expect(getQualitySnapshot.name).toBe('tessera_get_quality_snapshot');
  });
});
