import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const REPO_ROOT = join(__dirname, '..', '..');

function loadJson(rel: string): unknown {
  return JSON.parse(readFileSync(join(REPO_ROOT, rel), 'utf8'));
}

describe('server.json manifest', () => {
  const manifest = loadJson('server.json') as Record<string, unknown>;
  const schema = loadJson('server.schema.cache.json') as Record<string, unknown>;
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  it('validates against the pinned MCP Registry server.schema.json', () => {
    const ok = validate(manifest);
    if (!ok) {
      throw new Error(
        `server.json failed schema validation:\n${JSON.stringify(validate.errors, null, 2)}`,
      );
    }
    expect(ok).toBe(true);
  });

  it('has description within registry 100-char limit', () => {
    expect(typeof manifest.description).toBe('string');
    expect((manifest.description as string).length).toBeLessThanOrEqual(100);
  });

  it('publisher-provided _meta marshals under the 4KB registry limit', () => {
    const meta = manifest._meta as Record<string, unknown> | undefined;
    const pp = meta?.['io.modelcontextprotocol.registry/publisher-provided'];
    expect(pp, 'publisher-provided block is required for Tessera metadata').toBeDefined();
    const bytes = Buffer.byteLength(JSON.stringify(pp), 'utf8');
    expect(bytes).toBeLessThanOrEqual(4096);
  });

  it('package version mirrors top-level version', () => {
    const packages = manifest.packages as Array<{ version: string }>;
    expect(packages).toHaveLength(1);
    expect(packages[0]!.version).toBe(manifest.version);
  });

  it('package version matches package.json', () => {
    const pkg = loadJson('node/package.json') as { version: string };
    const packages = manifest.packages as Array<{ version: string }>;
    expect(packages[0]!.version).toBe(pkg.version);
    expect(manifest.version).toBe(pkg.version);
  });
});
