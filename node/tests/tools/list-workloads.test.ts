import { describe, expect, it } from 'vitest';
import { runWithSession } from '../../src/auth.js';
import { listWorkloads } from '../../src/tools/list-workloads.js';
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
  workloads: [
    {
      id: 'wkl_01',
      name: 'support-triage',
      anchor_cost_usd_per_1m_tokens: 2.5,
      baseline_tokens_30d: 4_200_000,
      current_mechanic_stack: ['M1', 'M3', 'M12'],
      last_baseline_recompute_at: '2026-05-20T06:00:00Z',
    },
    {
      id: 'wkl_02',
      name: 'summarisation',
      anchor_cost_usd_per_1m_tokens: 10.0,
      baseline_tokens_30d: 800_000,
      current_mechanic_stack: ['M1', 'M5'],
      last_baseline_recompute_at: '2026-05-20T06:00:00Z',
    },
  ],
};

describe('tessera_list_workloads tool', () => {
  it('hits /api/v1/workloads with project_id + bearer token and returns parsed body', async () => {
    const calls = mockFetch({ status: 200, body: UPSTREAM_RESPONSE });

    const result = await runWithSession(session, () => listWorkloads.handler({}, session));

    expect(result).toEqual(UPSTREAM_RESPONSE);
    expect(calls).toHaveLength(1);

    const url = new URL(calls[0]!.url);
    expect(url.origin).toBe('https://ledger.tesseraai.io');
    expect(url.pathname).toBe('/api/v1/workloads');
    expect(url.searchParams.get('project_id')).toBe('prj_fixture');
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.headers.authorization).toBe('Bearer tk_live_test');
    expect(calls[0]?.headers.accept).toBe('application/json');
  });

  it('surfaces upstream 5xx with status code in the error', async () => {
    mockFetch({ status: 502, body: 'upstream down' });

    await expect(
      runWithSession(session, () => listWorkloads.handler({}, session)),
    ).rejects.toThrow(/502.*api\/v1\/workloads/);
  });

  it('has the public tool name and inputSchema shape an MCP client expects', () => {
    expect(listWorkloads.name).toBe('tessera_list_workloads');
    expect(listWorkloads.description).toMatch(/workloads/i);
    // Empty inputSchema — list takes no args. Schema must still parse `{}` successfully.
    expect(() => listWorkloads.inputSchema.parse({})).not.toThrow();
  });
});

