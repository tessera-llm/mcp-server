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

interface DriftEvent {
  detected_at: string;
  metric: 'quality_floor' | 'p50_score' | 'p95_score' | 'composition_cap';
  expected: number;
  observed: number;
  action_taken: 'auto_rollback' | 'stack_disabled' | 'logged' | 'composition_capped';
}

interface Result {
  workload_id: string;
  window: string;
  sla_floor: number;
  p50_quality_score: number;
  p95_quality_score: number;
  composition_cap_active: boolean;
  drift_events: DriftEvent[];
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
    'Return the quality snapshot for a workload — SLA floor (e.g. 0.95), measured p50 and p95 quality scores from canary evaluations, whether composition cap is active (max 2 content-mutators per request), and any drift events recorded in the window. Drift events surface auto-rollbacks, per-stack disables, and composition-cap breaches. Quality is THE primary trust factor — savings without quality verification is not Tessera surface.',
  inputSchema,
  handler: (args) => handler(args, getCurrentSession()),
};
