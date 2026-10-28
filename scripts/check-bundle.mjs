#!/usr/bin/env node
// Fails the build if a secret ever reaches the client bundle (.next/static).
// Run after `next build`: `node scripts/check-bundle.mjs`
import { readdirSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SECRETS = ['OPENROUTER_API_KEY', 'sk-or-', 'MINIMAX_API_KEY', 'SESSION_SECRET', 'DEMO_PASSWORD'];

/** Returns one violation per secret found in a file under `dir` (recursively). */
export function scan(dir) {
  const violations = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      violations.push(...scan(path));
      continue;
    }
    const content = readFileSync(path, 'latin1');
    for (const secret of SECRETS) {
      if (content.includes(secret)) violations.push(`${path}: ${secret}`);
    }
  }
  return violations;
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-check-'));
  try {
    writeFileSync(join(dir, 'chunk.js'), 'const k = "sk-or-fake";');
    const violations = scan(dir);
    if (violations.length !== 1 || !violations[0].includes('sk-or-')) {
      console.error('self-test failed: the fake key was not detected');
      process.exit(1);
    }
    console.log('self-test ok');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  const dir = '.next/static';
  let violations;
  try {
    violations = scan(dir);
  } catch (e) {
    console.error(`check-bundle: cannot read ${dir}: ${e.message}`);
    process.exit(1);
  }
  if (violations.length > 0) {
    console.error('check-bundle: a secret reached the client bundle:');
    for (const v of violations) console.error(`  ${v}`);
    process.exit(1);
  }
  console.log(`check-bundle: no secret in ${dir}`);
}
