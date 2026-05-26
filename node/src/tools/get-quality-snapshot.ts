import { z } from 'zod';
import { getCurrentSession } from '../auth.js';
import type { ToolDefinition } from '../types.js';
import { upstreamGet } from '../upstream.js';

const inputSchema = z.object({
  workload_id: z.string().describe('Workload UUID returned from tessera_list_workloads.'),
  window: z
    .enum(['7d', '30d', 'mtd'])
    .default('30d')
    .describe('Time window for the quality measurement.'),
});

type Args = z.infer<typeof inputSchema>;

interface Result {
  workload_id: string;
  window: string;
  sla_floor: number;
  p50_quality_score: number | null;
  p95_quality_score: number | null;
  measured_samples: number;
  as_of: string;
}

async function handler(args: Args, ctx: ReturnType<typeof getCurrentSession>): Promise<Result> {
  return upstreamGet<Result>({
    path: '/api/v1/quality/snapshot',
    query: { workload_id: args.workload_id, window: args.window },
    ctx,
  });
}

export const getQualitySnapshot: ToolDefinition<Args, Result> = {
  name: 'tessera_get_quality_snapshot',
  description:
    'Return the quality snapshot for a workload — SLA floor (default 0.95) and measured p50 / p95 quality scores from canary evaluations over the chosen window. Null p50 / p95 means there were no canary samples in the window. Quality is the primary trust factor — savings without quality verification is not Tessera surface.',
  inputSchema,
  handler: (args) => handler(args, getCurrentSession()),
};
