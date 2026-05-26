import { describe, expect, it } from 'vitest';
import { runWithSession } from '../../src/auth.js';
import { getLedgerEntries } from '../../src/tools/get-ledger-entries.js';
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
  entries: [
    {
      entry_id: 'led_01',
      workload_id: 'wkl_01',
      recorded_at: '2026-05-26T00:00:00Z',
      provider: 'openai',
      model: 'gpt-4o-mini-2024-07-18',
      mechanic_stack_applied: ['M1', 'M3', 'M12'],
      anchor_cost_usd: 0.0012,
      actual_cost_usd: 0.00074,
      savings_classification: 'realised' as const,
      pricing_catalog_snapshot_id: 'ps_01HXKTM4Y7Z8A3B9D2E5F6G7H8',
    },
  ],
  has_more: false,
  next_since: null,
};

describe('tessera_get_ledger_entries tool', () => {
  it('passes workload_id, since, and limit as query params', async () => {
    const calls = mockFetch({ status: 200, body: UPSTREAM_RESPONSE });

    const result = await runWithSession(session, () =>
      getLedgerEntries.handler(
        { workload_id: 'wkl_01', since: '2026-05-25T00:00:00Z', limit: 50 },
        session,
      ),
    );

    expect(result).toEqual(UPSTREAM_RESPONSE);
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe('/api/v1/ledger/entries');
    expect(url.searchParams.get('workload_id')).toBe('wkl_01');
    expect(url.searchParams.get('since')).toBe('2026-05-25T00:00:00Z');
    expect(url.searchParams.get('limit')).toBe('50');
  });

  it('uses default limit of 100 when omitted', () => {
    const parsed = getLedgerEntries.inputSchema.parse({
      workload_id: 'wkl_01',
      since: '2026-05-25T00:00:00Z',
    });
    expect(parsed.limit).toBe(100);
  });

  it('rejects a limit above the hard cap of 500', () => {
    expect(() =>
      getLedgerEntries.inputSchema.parse({
        workload_id: 'wkl_01',
        since: '2026-05-25T00:00:00Z',
        limit: 999,
      }),
    ).toThrow();
  });

  it('exposes the public tool name', () => {
    expect(getLedgerEntries.name).toBe('tessera_get_ledger_entries');
  });
});
