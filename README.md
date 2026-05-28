# tessera-mcp-server

> The MCP server that returns money, not data.

[![npm version](https://img.shields.io/npm/v/@tessera-llm/mcp-server.svg)](https://www.npmjs.com/package/@tessera-llm/mcp-server)
[![Apache-2.0 License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

**Status:** v0.1.3 — published 2026-05-27 on npm with sigstore SLSA provenance v1, listed on `registry.modelcontextprotocol.io`.

Tessera is an LLM proxy that optimizes API spend through multi-provider routing, prompt compression, audit-immutable logging, output-length prediction, and batch arbitrage. This package exposes Tessera as an [MCP](https://modelcontextprotocol.io) server for tool-using agents — Claude Desktop, Claude Code, Cursor, Cline, Continue, Goose, Zed.

Where other LLM-infrastructure MCP servers return logs, traces, or prompt metadata, this one returns **savings decisions**: what's drifting, what to switch, what to approve, what to audit.

## Install

```bash
npx @tessera-llm/mcp-server
```

Or add to your client config:

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "tessera": {
      "command": "npx",
      "args": ["-y", "@tessera-llm/mcp-server"],
      "env": {
        "TESSERA_API_KEY": "tk_..."
      }
    }
  }
}
```

**Claude Code** (`.mcp.json` in project root):

```json
{
  "mcpServers": {
    "tessera": {
      "command": "npx",
      "args": ["-y", "@tessera-llm/mcp-server"],
      "env": {
        "TESSERA_API_KEY": "tk_..."
      }
    }
  }
}
```

**Cursor** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "tessera": {
      "command": "npx",
      "args": ["-y", "@tessera-llm/mcp-server"],
      "env": { "TESSERA_API_KEY": "tk_..." }
    }
  }
}
```

Get a `TESSERA_API_KEY` at [tesseraai.io/dev](https://tesseraai.io/dev) — Free Sandbox is 60M tokens/month with no card.

## Tools

v0.1 exposes 6 tools (5 read + 1 mutate). Hard cap — no tool sprawl.

| Tool | Read/Write | Purpose |
|---|---|---|
| `tessera_list_workloads` | read | List your mapped workloads with anchor cost + current m-stack. |
| `tessera_get_savings_report` | read | Anchored spend + measured savings for a window. |
| `tessera_get_recommendation_queue` | read | Pending Optimize-tab recommendations with expected lift + confidence. |
| `tessera_get_ledger_entries` | read | Audit-immutable Monthly Reading rows (provider call, mechanic stack applied, savings). |
| `tessera_get_quality_snapshot` | read | SLA floor + p50/p95 quality scores + drift events. |
| `tessera_approve_recommendation` | **mutate** | Move a queued mechanic from "suggested" to "active" with audit-trail entry. |

Provider config writes, API-key management, composition cap changes, and Stripe operations are deliberately NOT in this surface — they live in the dashboard, where blast-radius requires explicit modal confirmation.

## Transport

- **stdio** (default) — local clients (Claude Desktop, Cursor, Cline, Continue, Claude Code)
- **Streamable HTTP** (optional) — set `TESSERA_MCP_TRANSPORT=http` to bind on `localhost:8788` for remote / Goose / Zed-via-`mcp-remote`

SSE (deprecated in MCP spec 2025-11-25) is not supported.

## Auth

`TESSERA_API_KEY` env var or `Authorization: Bearer <key>` header (HTTP transport). Same API key as the SDK — `tk_*` format. Future v0.2: OAuth 2.1 (aligned with MCP spec RC 2026-07-28).

## Security posture

- Tools receiving user-controlled content (ledger notes, recommendation rationale strings, workload names) are labelled `__untrusted__` to prevent prompt-injection cascade per the Supabase/Cursor 2025 pattern.
- `mcp-scan` (Invariant Labs) runs in CI to catch tool-poisoning attacks in tool descriptions.
- No `execute_code` escape hatch. Typed verbs only.
- No session-based auth. Every request authenticates independently per MCP spec 2026 requirement.

## License

[Apache-2.0](LICENSE). Tessera is a product of [Fintechagency OÜ](https://ariregister.rik.ee/eng/company/16638667) (Estonia, Tallinn).

## Links

- Tessera landing: [tesseraai.io](https://tesseraai.io)
- Free Sandbox signup: [tesseraai.io/dev](https://tesseraai.io/dev)
- How it works: [tesseraai.io/how-it-works](https://tesseraai.io/how-it-works)
- MCP protocol spec: [modelcontextprotocol.io](https://modelcontextprotocol.io)
