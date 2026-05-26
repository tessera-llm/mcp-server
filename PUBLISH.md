# Publish playbook — tessera-mcp-server

The CI workflow in `.github/workflows/publish-node.yml` automates the build, test, and npm publish. v0.1 ships Node-only; a Python wrapper may follow in v0.2.

## One-time setup

1. **Repo secrets** — set via `gh secret set NAME --repo tessera-llm/mcp-server`:
   - `NPM_TOKEN` — npm automation token with publish access to `@tessera-llm/mcp-server` under the `tessera-llm` org.

2. **npm scope reserved** — the `@tessera-llm` scope owns the package name. `npm view @tessera-llm/mcp-server` should resolve to the namespace placeholder before the first real publish.

## Release steps

1. **Pick the next version.** Semver. `node/package.json` and `server.json` (top-level `version` + `packages[0].version`) MUST agree — `tests/manifest.test.ts` enforces this on CI.

2. **Bump version in three places** (one file, two fields):
   - `node/package.json` → `"version": "X.Y.Z"`
   - `server.json` → `"version": "X.Y.Z"` (top-level)
   - `server.json` → `"packages[0].version": "X.Y.Z"`

3. **Update `CHANGELOG.md`** with the new version block + entries.

4. **Commit + push** the version bump + CHANGELOG.

5. **Create + push the release tag:**

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

   The `v*` tag triggers `publish-node.yml` → npm publish with sigstore provenance.

6. **Verify after publish:**

   ```bash
   curl -sI https://registry.npmjs.org/@tessera-llm/mcp-server/X.Y.Z
   npm view @tessera-llm/mcp-server@X.Y.Z
   ```

   Both should return `200 OK` / valid JSON. npm usually indexes within 10-30 seconds.

7. **GitHub Release object** — after publish succeeds:

   ```bash
   gh release create v0.1.0 \
     --title "v0.1.0 — first public release" \
     --notes-file <(awk '/^## \[0\.1\.0\]/{flag=1} /^## \[/&&!/0\.1\.0/{flag=0} flag' CHANGELOG.md)
   ```

   The Release object is what awesome-list maintainers and analytics tools index — without it, the version on npm looks orphaned.

8. **MCP Registry submission** (separate flow, post-publish):
   - DNS TXT record on `tesseraai.io` proving namespace ownership for `io.tesseraai/mcp-server`.
   - Submit `server.json` via the official MCP Registry CLI or the registry submission form.
   - Track at https://registry.modelcontextprotocol.io after acceptance.

9. **Distribution** — `marketing/awesome-list-prs-queue.md` in the main tessera-ai monorepo tracks downstream listings (Glama, mcp.so, punkpeye/awesome-mcp-servers, mcpservers.org). Fire C1-C5 from `plans/tessera-forward-plan-2026-05-26-eod.md` once v0.1.0 lands on npm.

## Common failure modes

- **`npm publish` fails with `403 Forbidden`:** the `NPM_TOKEN` doesn't have publish access to the `@tessera-llm` scope. Regenerate via `npm token create --read-only=false` (after `npm login`), then update the repo secret.
- **Manifest test fails on CI:** `node/package.json` version doesn't match `server.json` version. Re-run the version bump in both files.
- **Schema validation fails on CI:** a `server.json` field drifted away from the registry schema. Refresh `server.schema.cache.json` from `https://raw.githubusercontent.com/modelcontextprotocol/registry/main/docs/reference/server-json/draft/server.schema.json` and re-validate locally.
- **`npm publish` succeeds but provenance missing:** workflow ran without `id-token: write` permission, or `--provenance` flag was dropped. CI yaml owns both.

## Versioning policy

Semver. Wire format compatibility across minor versions (0.X.Y). Breaking changes only on major bumps. Tool surface (`tools/` directory) is the public contract — renaming a tool or removing a parameter is a major bump.

## Pre-publish checklist (manual before tagging)

- [ ] `npm run typecheck` passes locally
- [ ] `npm test` passes locally (39+ tests)
- [ ] `server.json` validates against the schema (`tests/manifest.test.ts`)
- [ ] CHANGELOG.md updated with the new version
- [ ] Version bumped in `node/package.json` AND `server.json` (×2 fields)
- [ ] README.md install snippet still accurate
- [ ] No secrets / tokens in source or committed env files (`git secrets` / `gitleaks`)
