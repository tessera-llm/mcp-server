#!/usr/bin/env node
/**
 * Copy README.md + LICENSE from repo root → node/ before `npm pack` / `npm publish`.
 *
 * Background: this package lives at `node/` inside a monorepo whose `README.md`
 * and `LICENSE` are at the repo ROOT (one level up). npm packs from where
 * `package.json` lives — it resolves `files: ["README.md", "LICENSE"]`
 * relative to `node/`, not relative to repo root. Without this copy step,
 * the published tarball ships dist + package.json + nothing else, and
 * npmjs.com shows a blank package page.
 *
 * Founder-locked 2026-05-27 launch-eve fix after the v0.1.2 audit found
 * `readmeFilename: ""` on npm registry. P0-1 in the MCP audit memo.
 *
 * This script is idempotent. The `prepack` lifecycle hook runs it before
 * every `npm pack` and `npm publish`. If you ever edit `node/README.md`
 * or `node/LICENSE` directly, they will be overwritten on next pack —
 * always edit the root-level files.
 *
 * Cross-platform: pure Node, no shell-specific `cp` / `copy` commands.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));     // node/scripts/
const nodeDir = resolve(here, '..');                      // node/
const repoRoot = resolve(nodeDir, '..');                  // repo root

const files = [
  { src: 'README.md', dest: 'README.md' },
  { src: 'LICENSE', dest: 'LICENSE' },
];

let missing = 0;
for (const { src, dest } of files) {
  const srcPath = resolve(repoRoot, src);
  const destPath = resolve(nodeDir, dest);
  if (!existsSync(srcPath)) {
    console.error(`copy-docs: source missing — ${srcPath}`);
    missing += 1;
    continue;
  }
  copyFileSync(srcPath, destPath);
  console.log(`copy-docs: ${srcPath} → ${destPath}`);
}

if (missing > 0) {
  console.error(`copy-docs: ${missing} required file(s) missing — abort`);
  process.exit(1);
}
