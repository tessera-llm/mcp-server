import { z } from 'zod';
import { getCurrentSession } from '../auth.js';
import type { ToolDefinition } from '../types.js';
import { upstreamPost } from '../upstream.js';

const inputSchema = z.object({
  recommendation_id: z
    .string()
    .describe('Recommendation UUID returned from tessera_get_recommendation_queue.'),
  approval_note: z
    .string()
    .max(500)
    .optional()
    .describe('Optional human-readable note appended to the recommendation notes field next to the approval timestamp.'),
});

type Args = z.infer<typeof inputSchema>;

interface Result {
  recommendation_id: string;
  workload_id: string | null;
  previous_status: 'open';
  new_status: 'in_progress';
  approved_at: string;
  approved_by_session_key_prefix: string;
}

async function handler(args: Args, ctx: ReturnType<typeof getCurrentSession>): Promise<Result> {
  return upstreamPost<Result>({
    path: `/api/v1/recommendations/${encodeURIComponent(args.recommendation_id)}/approve`,
    body: { approval_note: args.approval_note ?? null },
    ctx,
    knownErrors: {
      404: 'Recommendation not found. Re-fetch the queue to confirm it still exists.',
      403: 'Recommendation belongs to a different client. Check the recommendation_id is from your own queue.',
      409: 'Recommendation is no longer in open state. Re-fetch the queue to see current status.',
    },
  });
}

export const approveRecommendation: ToolDefinition<Args, Result> = {
  name: 'tessera_approve_recommendation',
  description:
    'Approve a pending recommendation — transitions it from "open" to "in_progress" and appends an approval line (with the approving session\'s API key prefix) to the recommendation notes. THIS IS THE ONLY MUTATING TOOL IN v0.1. Provider config changes, API key management, composition cap changes, and Stripe operations are deliberately not exposed here — those live in the dashboard where blast radius requires explicit modal confirmation.',
  inputSchema,
  handler: (args) => handler(args, getCurrentSession()),
};
