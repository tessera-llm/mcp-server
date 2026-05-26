import { z } from 'zod';
import { getCurrentSession } from '../auth.js';
import type { ToolDefinition } from '../types.js';
import { upstreamGet } from '../upstream.js';

const inputSchema = z.object({
  workload_id: z
    .string()
    .optional()
    .describe('Filter by workload UUID. Omit to get pending recommendations across all workloads.'),
});

type Args = z.infer<typeof inputSchema>;

interface Recommendation {
  recommendation_id: string;
  workload_id: string;
  workload_name: string;
  mechanic_id: string;
  mechanic_label: string;
  expected_lift_pct: number;
  confidence: number;
  sample_size: number;
  proposed_at: string;
  rationale: string;
}

interface Result {
  recommendations: Recommendation[];
  total_count: number;
}

async function handler(args: Args, ctx: ReturnType<typeof getCurrentSession>): Promise<Result> {
  const query: Record<string, string> = {};
  if (args.workload_id) {
    query.workload_id = args.workload_id;
  }
  return upstreamGet<Result>({ path: '/api/v1/recommendations/queue', query, ctx });
}

export const getRecommendationQueue: ToolDefinition<Args, Result> = {
  name: 'tessera_get_recommendation_queue',
  description:
    'Return pending Optimize-tab recommendations — mechanic swaps Tessera proposes for a workload based on canary results. Each recommendation includes the mechanic id (M1 chained routing, M3 system-prompt split, M5 semantic cache, M9 output-length predictor, M10 batch arbitrage, M12 audit emit), expected lift percent, statistical confidence, and the sample size the canary measured against. The rationale field MAY contain user-controlled workload names but never prompt content.',
  inputSchema,
  handler: (args) => handler(args, getCurrentSession()),
};
