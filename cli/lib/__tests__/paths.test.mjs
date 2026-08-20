// packages/ok-playbook/cli/lib/__tests__/paths.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { findProjectRoot, defaultPaths } from "../paths.mjs";

test("findProjectRoot finds dir with package.json from cwd", () => {
  const tmp = mkdtempSync(join(tmpdir(), "okplaybook-paths-"));
  writeFileSync(join(tmp, "package.json"), "{}");
  try {
    assert.equal(findProjectRoot(tmp), tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("findProjectRoot walks up to find package.json", () => {
  const tmp = mkdtempSync(join(tmpdir(), "okplaybook-paths-"));
  const child = join(tmp, "sub", "nested");
  mkdirSync(child, { recursive: true });
  writeFileSync(join(tmp, "package.json"), "{}");
  try {
    assert.equal(findProjectRoot(child), tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("findProjectRoot throws if no package.json found", () => {
  const tmp = mkdtempSync(join(tmpdir(), "okplaybook-paths-"));
  try {
    assert.throws(() => findProjectRoot(tmp), /package\.json não encontrado/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("defaultPaths returns canonical 8 paths", () => {
  const p = defaultPaths();
  assert.equal(p.pendencias, "docs/pendencias/");
  assert.equal(p.docs, "docs/");
  assert.equal(p.arch, "docs/project-architecture/");
  assert.equal(p.agents, "docs/project-architecture/agents/");
  assert.equal(p.superpowers, "docs/superpowers/");
  assert.equal(p.backlog, "docs/agent-feedback/");
  assert.equal(p.drafts, "docs/_drafts/");
  assert.equal(p.insights, "docs/insights/");
});
