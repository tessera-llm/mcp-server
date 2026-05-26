import { z } from 'zod';
import { getCurrentSession } from '../auth.js';
import type { ToolDefinition } from '../types.js';
import { upstreamGet } from '../upstream.js';

const inputSchema = z.object({
  workload_id: z
    .string()
    .optional()
    .describe('Filter by workload UUID. Omit to get open recommendations across all workloads.'),
});

type Args = z.infer<typeof inputSchema>;

interface Recommendation {
  recommendation_id: string;
  workload_id: string | null;
  family: string;
  title: string;
  description: string | null;
  est_monthly_savings_usd_low: number | null;
  est_monthly_savings_usd_mid: number | null;
  est_monthly_savings_usd_high: number | null;
  engineering_days: number | null;
  reversibility: string | null;
  output_quality_risk: string | null;
  status: string;
  priority: number;
  created_at: string;
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
    'Return open Optimize-tab recommendations — proposed actions (routing changes, caching switches, batching, etc) that Tessera suggests for a workload. Each carries a family classification, human-readable title and description, an estimated monthly savings range in USD (low / mid / high), engineering days to implement, reversibility, output-quality risk level, status, and priority (lower = higher priority). Sorted by priority ascending. Description and notes fields may contain customer-controlled workload names but never prompt content.',
  inputSchema,
  handler: (args) => handler(args, getCurrentSession()),
};
