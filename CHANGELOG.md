# Changelog

All notable changes to `@tessera-llm/mcp-server` are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Scaffold for v0.1.0 — package layout, tsconfig, stdio transport, auth via `TESSERA_API_KEY` env var, AsyncLocalStorage-based session context, all 6 tool definitions (`tessera_list_workloads`, `tessera_get_savings_report`, `tessera_get_recommendation_queue`, `tessera_get_ledger_entries`, `tessera_get_quality_snapshot`, `tessera_approve_recommendation`), shared `upstream.ts` fetch helper, Zod-validated tool schemas.

### Changed (2026-05-26 scaffold review)
- SessionContext now mirrors the dashboard `proxy_api_keys` schema: `clientId` + optional `workloadId` + `plan` + `keyPrefix`. The earlier `userId` / `workspaceId` / `projectId` shape was a guess that did not match reality. API key prefix check relaxed from `tk_live_` / `tk_test_` to simply `tk_`, since the dashboard does not split keys by environment in the prefix.
- `upstream.ts` no longer auto-injects a scope id into requests. The Bearer API key scopes the request server-side via the dashboard's existing key lookup; passing a redundant `client_id` query / body field was wrong.

### Prerequisite for v0.1.0 publish
- **Dashboard endpoints not yet implemented.** The 6 tool handlers call `/api/v1/workloads`, `/api/v1/savings-report`, `/api/v1/recommendations/queue`, `/api/v1/ledger/entries`, `/api/v1/quality/snapshot`, `/api/v1/recommendations/{id}/approve`, and the auth path calls `/api/internal/validate-key`. None of these routes exist on `ledger.tesseraai.io` at this commit. They must be implemented dashboard-side BEFORE this server is published to npm. Each endpoint is a thin server-action-style wrapper over existing Supabase queries — estimated 7-8 agent-hours total. Tracked as prerequisite task in parent project.

### Pending (v0.1.0)
- Streamable HTTP transport (Express + `StreamableHTTPServerTransport`) gated behind `TESSERA_MCP_TRANSPORT=http`.
- `__untrusted__` labelling on tool results containing user-controlled content (ledger notes, recommendation rationale strings, workload names).
- `mcp-scan` (Invariant Labs) CI gate.
- Tests via Vitest with mock upstream API.
- Manifest (`server.json`) for official MCP Registry submission.

## [0.1.0-alpha.0] — 2026-05-26

- Initial scaffold per spec `D:/Skin/plans/tessera-mcp-server-spec-2026-05-26.md`.
- Not yet published to npm; awaiting full tool implementation + tests + manifest.
