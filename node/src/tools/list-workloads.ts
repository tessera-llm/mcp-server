import { z } from 'zod';
import { getCurrentSession } from '../auth.js';
import type { ToolDefinition } from '../types.js';
import { markUntrusted } from '../untrusted.js';
import { upstreamGet } from '../upstream.js';

const inputSchema = z.object({}).describe('No arguments.');

type Args = z.infer<typeof inputSchema>;

interface Workload {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  scope_status: string;
  created_at: string;
  updated_at: string;
}

interface Result {
  workloads: Workload[];
}

async function handler(_args: Args, ctx: ReturnType<typeof getCurrentSession>): Promise<Result> {
  const raw = await upstreamGet<Result>({ path: '/api/v1/workloads', ctx });
  return {
    workloads: raw.workloads.map((w) => ({ ...w, name: markUntrusted(w.name) })),
  };
}

export const listWorkloads: ToolDefinition<Args, Result> = {
  name: 'tessera_list_workloads',
  description:
    'List the mapped workloads in the current Tessera workspace. Each workload represents a category of LLM calls (e.g. "support-triage", "summarisation", "ranker-prompt") with its target provider, model id, and scope status. Use this as the entry point before drilling into savings, recommendations, ledger entries, or quality snapshots for a specific workload. Returns no secrets and no prompt content.',
  inputSchema,
  handler: (args) => handler(args, getCurrentSession()),
};
