/**
 * Tool registry — v0.1 ships 6 tools (5 read + 1 mutate).
 * Hard cap. No additions without spec update at plans/tessera-mcp-server-spec-2026-05-26.md.
 */

import type { ToolDefinition } from '../types.js';
import { approveRecommendation } from './approve-recommendation.js';
import { getLedgerEntries } from './get-ledger-entries.js';
import { getQualitySnapshot } from './get-quality-snapshot.js';
import { getRecommendationQueue } from './get-recommendation-queue.js';
import { getSavingsReport } from './get-savings-report.js';
import { listWorkloads } from './list-workloads.js';

export const tools: ReadonlyArray<ToolDefinition<unknown, unknown>> = [
  listWorkloads,
  getSavingsReport,
  getRecommendationQueue,
  getLedgerEntries,
  getQualitySnapshot,
  approveRecommendation,
] as unknown as ReadonlyArray<ToolDefinition<unknown, unknown>>;

export const toolNames = [
  'tessera_list_workloads',
  'tessera_get_savings_report',
  'tessera_get_recommendation_queue',
  'tessera_get_ledger_entries',
  'tessera_get_quality_snapshot',
  'tessera_approve_recommendation',
] as const;

export type ToolName = (typeof toolNames)[number];
