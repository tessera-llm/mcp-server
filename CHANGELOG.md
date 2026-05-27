# Changelog

All notable changes to `@tessera-llm/mcp-server` are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] — 2026-05-27

Patch release adding the `mcpName` field that the official MCP Registry requires on the npm package manifest before it will accept a publish for the corresponding registry namespace.

### Added
- `mcpName: io.tesseraai/mcp-server` in `node/package.json`. The Registry fetches the npm manifest at publish time and matches this field against the namespace claimed in `server.json`. Without it, `mcp-publisher publish` returns HTTP 400 with `NPM package '@tessera-llm/mcp-server' is missing required 'mcpName' field`.

## [0.1.0] — 2026-05-27

First public release on npm. Apache-2.0, sigstore-attested via the `v*`-tag publish workflow.

### Added
- Package layout, tsconfig, stdio transport, auth via `TESSERA_API_KEY` env var, AsyncLocalStorage-based session context, all 6 tool definitions (`tessera_list_workloads`, `tessera_get_savings_report`, `tessera_get_recommendation_queue`, `tessera_get_ledger_entries`, `tessera_get_quality_snapshot`, `tessera_approve_recommendation`), shared `upstream.ts` fetch helper, Zod-validated tool schemas.
- `server.json` manifest aligned with the official MCP Registry schema (validated against `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`). Speculative fields moved into `_meta.io.modelcontextprotocol.registry/publisher-provided` per the registry's 4KB extension namespace contract.
- `tests/manifest.test.ts` — vitest gate that re-validates `server.json` on every CI run, enforces the 100-char description limit, the 4KB `_meta` cap, and version parity between `server.json` and `node/package.json`.
- `PUBLISH.md` runbook covering version bumps, tag push, MCP Registry submission, and the publish failure modes.
- `.github/workflows/ci.yml` — Node 18/20/22 matrix (typecheck + build + test + static-scan) on every push and pull request.
- `.github/workflows/publish-node.yml` — `v*` tag → npm publish with sigstore provenance via OIDC. Static-scan runs before build.
- `src/untrusted.ts` — `markUntrusted()` helper plus `UNTRUSTED_PREAMBLE` warning. Tool results that echo customer-controlled strings (workload names in `tessera_list_workloads`, recommendation titles and descriptions in `tessera_get_recommendation_queue`) are wrapped in `<tessera:untrusted>…</tessera:untrusted>` sentinels. The server prepends the preamble as the first content block on every tool result so the calling LLM treats the wrapped regions as data, not instructions.
- `scripts/static-scan.mjs` — lightweight prompt-injection / tool-poisoning scan over tool descriptions and Zod `.describe()` strings. Catches PI001-PI005 (ignore-previous-instructions, fake authority tags, model-aimed imperatives, exfiltration prompts, cross-tool coercion). Runs in CI and in `prepublishOnly`. Upstream `snyk-agent-scan` (Invariant Labs mcp-scan rebranded) integration deferred to v0.2 — requires a stub-auth mode in the server first.
- Streamable HTTP transport behind `TESSERA_MCP_TRANSPORT=http`. Express app via the SDK's `createMcpExpressApp` (DNS rebinding protection on localhost by default), `POST /mcp` routes through `StreamableHTTPServerTransport` in stateless mode, `GET /mcp` and `DELETE /mcp` return 405. Per-request auth via `Authorization: Bearer tk_<key>` falls back to `TESSERA_API_KEY` when the header is absent. Liveness probe at `GET /healthz` requires no key. `TESSERA_MCP_PORT` (default 8788) and `TESSERA_MCP_HOST` (default 127.0.0.1) control bind. Required for Goose remote, Vercel-style hosted clients, and any deployment scenario where a single server instance serves multiple keys.

### Changed (scaffold review prior to first release)
- SessionContext now mirrors the dashboard `proxy_api_keys` schema: `clientId` + optional `workloadId` + `plan` + `keyPrefix`. The earlier `userId` / `workspaceId` / `projectId` shape was a guess that did not match reality. API key prefix check relaxed from `tk_live_` / `tk_test_` to simply `tk_`, since the dashboard does not split keys by environment in the prefix.
- `upstream.ts` no longer auto-injects a scope id into requests. The Bearer API key scopes the request server-side via the dashboard's existing key lookup; passing a redundant `client_id` query / body field was wrong.

### Dashboard endpoints — landed prior to publish
The 6 tool handlers call `/api/v1/workloads`, `/api/v1/savings-report`, `/api/v1/recommendations/queue`, `/api/v1/ledger/entries`, `/api/v1/quality/snapshot`, `/api/v1/recommendations/{id}/approve`, and the auth path calls `/api/internal/validate-key`. All seven endpoints are now live on `ledger.tesseraai.io` with the response shapes the tool handlers expect; aggregate paths use chunked fetch so reports stay correct past the PostgREST 1000-row cap. Server config defaults to that base via `TESSERA_UPSTREAM_API_BASE_URL`.

## [0.1.0-alpha.0] — 2026-05-26

- Initial scaffold per spec `D:/Skin/plans/tessera-mcp-server-spec-2026-05-26.md`.
- Not yet published to npm; awaiting full tool implementation + tests + manifest.
