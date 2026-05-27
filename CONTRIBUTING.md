# Contributing to `@tessera-llm/mcp-server`

Thanks for your interest. The Tessera MCP server is Apache-2.0 licensed and PRs are welcome.

## Reporting bugs

Open an issue at
[github.com/tessera-llm/mcp-server/issues](https://github.com/tessera-llm/mcp-server/issues)
with:

- Package version (`npm view @tessera-llm/mcp-server@<v>`)
- MCP host + version (Claude Desktop 0.x, Claude Code 0.x, Cursor 0.x, Cline 0.x, Continue 0.x, Goose 0.x, Zed 0.x)
- Node runtime version
- Minimum reproduction: tool call + observed result + expected result
- Any host logs

If the bug touches measurement or billing data returned by `tessera_get_savings_report` / `tessera_get_ledger_entries`, include the `client_id` visible at `/portal/billing` in the dashboard so we can trace the corresponding `request_id`.

For security vulnerabilities, see [`SECURITY.md`](./SECURITY.md) — please do not file public issues.

## Development setup

```bash
cd node
npm install
npm run typecheck
npm test
npm run static-scan
npm run build
```

The CI workflow at `.github/workflows/ci.yml` runs the same checks on every push and pull request — keep it green. `prepublishOnly` runs `build + test + static-scan` so a broken tree cannot land on npm by accident.

To exercise the server locally against a real MCP host, set the Sandbox `tk_` key from [tesseraai.io/dev](https://tesseraai.io/dev) and wire it into your host config per the README.

## What we want

- New tool **adapters** for MCP hosts not yet covered, gated by a working setup-test that demonstrates round-trip behaviour.
- **Tool-description hardening** — new patterns for `scripts/static-scan.mjs` PI001-PI005 that catch tool-poisoning attempts we miss today.
- **Untrusted-content labelling** improvements — `src/untrusted.ts` is intentionally small; if you see a tool result path that echoes customer-controlled content without the sentinel wrap, that is a bug.
- Streamable HTTP transport hardening (the `TESSERA_MCP_TRANSPORT=http` path in `src/server.ts`).
- Bug fixes shipped with a reproducing test.
- Documentation improvements.

## What we don't want (yet)

- A `tessera_execute_code` tool or any other code-execution escape hatch. Typed verbs only.
- Provider-config writes, API-key management, composition-cap changes, or Stripe operations — those live in the dashboard where the confirm modal is.
- Session-based auth — every request authenticates independently per the MCP spec 2026 requirement.
- Telemetry or analytics added to the server itself — measurement happens at the proxy.
- Vendored dependencies — keep the package installable from a single npm tag.

## Style

- **TypeScript:** strict mode, explicit return types on every public export, vitest tests sitting next to the code they exercise (`src/foo.ts` paired with `tests/foo.test.ts`).
- Tool definitions: descriptions explain the *agent contract* (what the tool returns, what it costs, what it mutates), not the implementation. Zod schemas double as runtime validation and self-documentation.
- Comments explain *why* a function exists. Mirror the conventions already established in `node/src/` — small files, single responsibility, no premature abstraction.

By contributing, you agree your contribution is licensed under Apache-2.0 matching the rest of the package.

## Contact

- Bug reports: GitHub Issues.
- Security: [security@tesseraai.io](mailto:security@tesseraai.io).
- Code of Conduct enforcement: [conduct@tesseraai.io](mailto:conduct@tesseraai.io) — see [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
- General: [contact@tesseraai.io](mailto:contact@tesseraai.io).
