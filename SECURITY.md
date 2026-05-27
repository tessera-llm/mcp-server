# Security Policy

If you find a vulnerability in `@tessera-llm/mcp-server` or in the way it interacts with the Tessera proxy, please report it privately.

**Email:** security@tesseraai.io

We aim to acknowledge reports within two business days and to ship a fix or a public mitigation note within 90 days of the initial report. If a report is materially time-sensitive (active exploitation, credential exposure, prompt-injection vector in a published tool description) we cut a release immediately.

## Scope

In scope:

- The published npm package `@tessera-llm/mcp-server`.
- The runnable examples in `examples/`.
- The wire format the server uses to talk to the Tessera dashboard at `ledger.tesseraai.io` (header names, auth surface, response envelope shapes).
- The tool descriptions and their Zod schemas shipped in the package — these are read by tool-using agents at runtime and are an injection surface.
- The `<tessera:untrusted>` sentinel labelling on tool results that echo customer-controlled strings (workload names, recommendation rationale, ledger notes).

Out of scope:

- The internal implementation of the Tessera proxy at `api.tesseraai.io` (we treat the proxy as a hosted service — please report proxy-side vulnerabilities the same way; we do not publish the proxy source).
- The Tessera dashboard at `ledger.tesseraai.io` — report dashboard vulnerabilities to the same email; we treat them with the same SLA.
- Upstream MCP host implementations (Claude Desktop, Claude Code, Cursor, Cline, Continue, Goose, Zed) — report to the upstream maintainer first; we will fast-follow on advisories.
- LLM model-side jailbreaks or prompt-injection vectors against the agent host itself — those belong to the host vendor or model provider.

## Threat classes we particularly care about

- **Tool-poisoning** — a malicious string in a tool description, parameter description, or Zod `.describe()` value that gets executed as instruction by the host model. Our `scripts/static-scan.mjs` runs PI001–PI005 patterns on every CI build and every `prepublishOnly`; net new patterns are very welcome.
- **Untrusted-content leakage** — a tool result that contains attacker-controlled content (e.g. a workload name set by an upstream user) and that an agent then treats as authoritative. We wrap such results in `<tessera:untrusted>` sentinels with a preamble; a report demonstrating a sentinel bypass is high-priority.
- **API-key exfiltration** — any path that surfaces the Sandbox `tk_` key into a model context that could persist it externally.
- **HTTP transport auth bypass** — when `TESSERA_MCP_TRANSPORT=http` is set, the Express app authenticates each request independently via `Authorization: Bearer tk_<key>`. Any bypass of the per-request check is in scope.

## What to include

A clean reproduction is the fastest path to a fix. Please include:

1. Package version (`npm view @tessera-llm/mcp-server@<v>` or the SHA from `package.json` if installed from git).
2. MCP host + version (Claude Desktop 0.x, Cursor 0.x, etc.).
3. Minimal repro: tool call payload + observed response + expected behaviour.
4. Any host logs or stack traces.

If your report includes potentially sensitive data (a prompt, an API key fragment, customer identifiers), encrypt the payload with our PGP key on request — email `security@tesseraai.io` and we will send the key.

## Disclosure

We follow a 90-day responsible disclosure window. If we acknowledge a report and ship a fix, we credit reporters in the corresponding `CHANGELOG.md` entry unless the reporter prefers anonymity. If we cannot ship a fix within 90 days we will publish a coordinated advisory documenting the issue and any mitigations available to users.

## Out-of-band

If you cannot reach `security@tesseraai.io`, you can DM `@govpun1-web` on GitHub for a fallback channel. Please do not file public issues for unpatched vulnerabilities.

Tessera is operated by Fintechagency OÜ, Tallinn, Estonia (registry 16638667).
