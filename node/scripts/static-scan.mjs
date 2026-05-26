#!/usr/bin/env node
/**
 * Lightweight static scan for prompt-injection / tool-poisoning patterns in
 * tool descriptions. Runs in CI before publish, no server boot required.
 *
 * Threat model:
 *   1. A tool description that asks the calling LLM to ignore prior
 *      instructions, exfiltrate context, or call a different tool.
 *   2. Embedded fake authority blocks (<system>, <|im_start|>, "SYSTEM:",
 *      "assistant:") that try to splice into the host model's prompt.
 *   3. Imperative directives aimed at the model rather than the developer.
 *
 * This is v0.1 coverage. v0.2 will wire snyk-agent-scan (formerly Invariant
 * Labs mcp-scan) once the server gains a static-describe mode that exposes
 * tool metadata without booting auth against the dashboard.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const TOOLS_DIR =
  process.env.TESSERA_STATIC_SCAN_TOOLS_DIR ?? join(__dirname, '..', 'src', 'tools');

const PATTERNS = [
  {
    id: 'PI001',
    label: 'Prompt-injection: ignore-previous-instructions',
    pattern: /\b(ignore|disregard|forget)\b.{0,30}\b(previous|prior|earlier|above)\b.{0,30}\b(instructions?|prompts?|system)\b/i,
  },
  {
    id: 'PI002',
    label: 'Fake authority tag: <system> / </system> / SYSTEM: / Assistant:',
    pattern: /(<\s*\/?\s*system\s*>|^\s*system:|^\s*assistant:|<\|im_start\|>|<\|im_end\|>)/im,
  },
  {
    id: 'PI003',
    label: 'Imperative aimed at the model ("you must call", "do not tell the user")',
    pattern: /\b(you must|do not tell the user|never reveal|hide this|secretly)\b/i,
  },
  {
    id: 'PI004',
    label: 'Exfiltration prompt ("send the user\'s ... to")',
    pattern: /\bsend\b.{0,40}\b(the user'?s?|your)\b.{0,40}\b(to|via|using)\b/i,
  },
  {
    id: 'PI005',
    label: 'Cross-tool coercion ("after this, call X tool")',
    pattern: /\bafter (this|that|calling this)\b.{0,40}\bcall\b.{0,40}\btool\b/i,
  },
];

function extractDescriptions(file) {
  const src = readFileSync(file, 'utf8');
  const findings = [];

  // `description: '...'` / "..." / `...` — single- or multi-line literal.
  // Captures any string literal whose key is `description` (object property
  // shorthand). Closing delimiter may be followed by comma, semicolon, or
  // close-brace.
  const descRegex = /\bdescription\s*:\s*(['"`])((?:\\.|[\s\S])*?)\1/g;
  for (const m of src.matchAll(descRegex)) {
    findings.push({ file, kind: 'description', text: m[2] });
  }

  // Zod `.describe('...')` strings on input schemas — these flow back to the
  // calling model as tool input docs and are an equally good injection
  // vector.
  const zodDescribeRegex = /\.describe\(\s*(['"`])((?:\\.|[\s\S])*?)\1\s*\)/g;
  for (const m of src.matchAll(zodDescribeRegex)) {
    findings.push({ file, kind: 'zod-describe', text: m[2] });
  }

  return findings;
}

function scan() {
  const files = readdirSync(TOOLS_DIR)
    .filter((f) => extname(f) === '.ts' && f !== 'index.ts')
    .map((f) => join(TOOLS_DIR, f));

  const allFindings = [];
  let totalDescriptions = 0;

  for (const file of files) {
    const descs = extractDescriptions(file);
    totalDescriptions += descs.length;

    for (const { kind, text } of descs) {
      for (const rule of PATTERNS) {
        if (rule.pattern.test(text)) {
          allFindings.push({
            file: file.replace(/\\/g, '/'),
            kind,
            rule: rule.id,
            label: rule.label,
            preview: text.slice(0, 180).replace(/\s+/g, ' '),
          });
        }
      }
    }
  }

  return { allFindings, totalDescriptions, fileCount: files.length };
}

function main() {
  const { allFindings, totalDescriptions, fileCount } = scan();

  console.log(
    `static-scan: ${totalDescriptions} description strings across ${fileCount} tool files`,
  );

  if (allFindings.length === 0) {
    console.log('static-scan: PASS — no injection-pattern matches');
    process.exit(0);
  }

  console.error('\nstatic-scan: FAIL — injection-pattern matches:');
  for (const f of allFindings) {
    console.error(`  [${f.rule}] ${f.label}`);
    console.error(`    in ${f.file} (${f.kind})`);
    console.error(`    text: ${f.preview}${f.preview.length === 180 ? '…' : ''}`);
  }
  process.exit(1);
}

main();
