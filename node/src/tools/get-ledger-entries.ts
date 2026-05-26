import { z } from 'zod';
import { getCurrentSession } from '../auth.js';
import type { ToolDefinition } from '../types.js';
import { upstreamGet } from '../upstream.js';

const inputSchema = z.object({
  workload_id: z.string().describe('Workload UUID returned from tessera_list_workloads.'),
  since: z
    .string()
    .describe('ISO 8601 timestamp. Returns ledger entries with optimize_savings.created_at >= this value.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .default(100)
    .describe('Maximum entries to return. Hard cap 500.'),
});

type Args = z.infer<typeof inputSchema>;

interface LedgerEntry {
  entry_id: string;
  workload_id: string;
  recorded_at: string;
  provider: string;
  model: string;
  mechanic_stack_applied: string[];
  anchor_cost_usd: number;
  actual_cost_usd: number;
  savings_classification: 'realised' | 'projected' | 'rejected_quality_floor';
  pricing_catalog_snapshot_id: string;
}

interface Result {
  entries: LedgerEntry[];
  has_more: boolean;
  next_since: string | null;
}

async function handler(args: Args, ctx: ReturnType<typeof getCurrentSession>): Promise<Result> {
  return upstreamGet<Result>({
    path: '/api/v1/ledger/entries',
    query: {
      workload_id: args.workload_id,
      since: args.since,
      limit: String(args.limit),
    },
    ctx,
  });
}

export const getLedgerEntries: ToolDefinition<Args, Result> = {
  name: 'tessera_get_ledger_entries',
  description:
    'Return audit-immutable Monthly Reading rows for a workload since a given timestamp. Each entry records: the provider call (e.g. openai/gpt-4o-mini-2024-07-18), the mechanic stack applied (e.g. ["M1", "M3", "M5"]), anchor cost (baseline pricing snapshot before optimization), actual cost (post-optimization), and the savings classification. Anchor cost and actual cost both reference the pricing_catalog_snapshot_id captured at the moment of the call — pricing changes after the fact never alter past ledger entries.',
  inputSchema,
  handler: (args) => handler(args, getCurrentSession()),
};
