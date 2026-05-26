import { describe, expect, it } from 'vitest';
import { runWithSession } from '../../src/auth.js';
import { getSavingsReport } from '../../src/tools/get-savings-report.js';
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
  window: '30d',
  anchored_spend_usd: 1240.55,
  actual_spend_usd: 768.91,
  measured_savings_usd: 471.64,
  measured_savings_pct: 38.02,
  performance_fee_accrued_usd: 94.33,
  performance_fee_pct: 20.0,
  ledger_entry_count: 3142,
  as_of: '2026-05-26T00:00:00Z',
};

describe('tessera_get_savings_report tool', () => {
  it('passes workload_id + window as query params and returns parsed body', async () => {
    const calls = mockFetch({ status: 200, body: UPSTREAM_RESPONSE });

    const result = await runWithSession(session, () =>
      getSavingsReport.handler({ workload_id: 'wkl_01', window: '30d' }, session),
    );

    expect(result).toEqual(UPSTREAM_RESPONSE);
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe('/api/v1/savings-report');
    expect(url.searchParams.get('workload_id')).toBe('wkl_01');
    expect(url.searchParams.get('window')).toBe('30d');
    expect(url.searchParams.get('project_id')).toBe('prj_fixture');
  });

  it('parses with default window when omitted', async () => {
    const parsed = getSavingsReport.inputSchema.parse({ workload_id: 'wkl_42' });
    expect(parsed).toEqual({ workload_id: 'wkl_42', window: '30d' });
  });

  it('rejects an invalid window value', () => {
    expect(() =>
      getSavingsReport.inputSchema.parse({ workload_id: 'wkl_42', window: 'forever' }),
    ).toThrow();
  });

  it('exposes the public tool name in snake_case verb_noun form', () => {
    expect(getSavingsReport.name).toBe('tessera_get_savings_report');
  });
});
