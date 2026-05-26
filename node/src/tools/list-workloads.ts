import { z } from 'zod';
import { getCurrentSession } from '../auth.js';
import type { ToolDefinition } from '../types.js';
import { upstreamGet } from '../upstream.js';

const inputSchema = z.object({}).describe('No arguments.');

type Args = z.infer<typeof inputSchema>;

interface Workload {
  id: string;
  name: string;
  anchor_cost_usd_per_1m_tokens: number;
  baseline_tokens_30d: number;
  current_mechanic_stack: string[];
  last_baseline_recompute_at: string;
}

interface Result {
  workloads: Workload[];
}

async function handler(_args: Args, ctx: ReturnType<typeof getCurrentSession>): Promise<Result> {
  return upstreamGet<Result>({ path: '/api/v1/workloads', ctx });
}

export const listWorkloads: ToolDefinition<Args, Result> = {
  name: 'tessera_list_workloads',
  description:
    'List the mapped workloads in the current Tessera workspace. Each workload represents a category of LLM calls (e.g. "support-triage", "summarisation", "ranker-prompt") with its anchor cost baseline and the current mechanic stack applied. Use this as the entry point before drilling into savings, recommendations, ledger entries, or quality snapshots for a specific workload. Returns no secrets and no prompt content.',
  inputSchema,
  handler: (args) => handler(args, getCurrentSession()),
};
