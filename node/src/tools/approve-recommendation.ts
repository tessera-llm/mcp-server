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
    .describe('Optional human-readable note recorded in the audit trail next to the approval event.'),
});

type Args = z.infer<typeof inputSchema>;

interface Result {
  recommendation_id: string;
  workload_id: string;
  mechanic_id: string;
  previous_status: 'suggested';
  new_status: 'active';
  approved_at: string;
  approved_by_user_id: string;
  audit_event_id: string;
}

async function handler(args: Args, ctx: ReturnType<typeof getCurrentSession>): Promise<Result> {
  return upstreamPost<Result>({
    path: `/api/v1/recommendations/${encodeURIComponent(args.recommendation_id)}/approve`,
    body: { approval_note: args.approval_note ?? null },
    ctx,
    knownErrors: {
      409: 'Recommendation already in non-suggested state. Re-fetch the queue to see current status.',
    },
  });
}

export const approveRecommendation: ToolDefinition<Args, Result> = {
  name: 'tessera_approve_recommendation',
  description:
    'Approve a pending recommendation — moves the mechanic from "suggested" to "active" on the target workload, writes an audit-trail entry, and returns the approval receipt. THIS IS THE ONLY MUTATING TOOL IN v0.1. Provider config changes, API key management, composition cap changes, and Stripe operations are deliberately not exposed here — those live in the dashboard where blast radius requires explicit modal confirmation. Idempotent: re-approving a recommendation that is already active returns 409.',
  inputSchema,
  handler: (args) => handler(args, getCurrentSession()),
};
