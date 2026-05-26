import { z } from 'zod';
import { getCurrentSession } from '../auth.js';
import type { ToolDefinition } from '../types.js';
import { upstreamGet } from '../upstream.js';

const inputSchema = z.object({
  workload_id: z.string().describe('Workload UUID returned from tessera_list_workloads.'),
  window: z
    .enum(['7d', '30d', 'mtd'])
    .default('30d')
    .describe('Time window for the savings calculation. 7d = trailing 7 days, 30d = trailing 30 days, mtd = month-to-date.'),
});

type Args = z.infer<typeof inputSchema>;

interface Result {
  workload_id: string;
  window: string;
  anchored_spend_usd: number;
  actual_spend_usd: number;
  measured_savings_usd: number;
  measured_savings_pct: number;
  performance_fee_accrued_usd: number;
  performance_fee_pct: number;
  ledger_entry_count: number;
  as_of: string;
}

async function handler(args: Args, ctx: ReturnType<typeof getCurrentSession>): Promise<Result> {
  return upstreamGet<Result>({
    path: '/api/v1/savings-report',
    query: { workload_id: args.workload_id, window: args.window },
    ctx,
  });
}

export const getSavingsReport: ToolDefinition<Args, Result> = {
  name: 'tessera_get_savings_report',
  description:
    'Return the savings report for a single workload over a chosen window. Compares anchor (baseline) spend against actual spend after Tessera optimizations, reports measured savings in USD and percent, and shows the performance fee accrued (20% of measured savings on Production plan, 0% on Free Sandbox). Audit-immutable — every number traces to ledger entries via tessera_get_ledger_entries.',
  inputSchema,
  handler: (args) => handler(args, getCurrentSession()),
};
