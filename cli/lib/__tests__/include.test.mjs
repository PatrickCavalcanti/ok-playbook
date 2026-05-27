// packages/ok-playbook/cli/lib/__tests__/include.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { appendInclude, hasInclude } from "../include.mjs";

function makeTmp() {
  return mkdtempSync(join(tmpdir(), "okplaybook-include-"));
}

test("appendInclude creates CLAUDE.md if missing", () => {
  const tmp = makeTmp();
  try {
    appendInclude(tmp);
    const content = readFileSync(join(tmp, "CLAUDE.md"), "utf8");
    assert.match(content, /<!-- ok-playbook:include:start -->/);
    assert.match(content, /@node_modules\/ok-playbook\/install\/claude-md-include\.md/);
    assert.match(content, /<!-- ok-playbook:include:end -->/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("appendInclude appends to existing CLAUDE.md preserving content", () => {
  const tmp = makeTmp();
  try {
    writeFileSync(join(tmp, "CLAUDE.md"), "# Meu projeto\n\nInstruções existentes.\n");
    appendInclude(tmp);
    const content = readFileSync(join(tmp, "CLAUDE.md"), "utf8");
    assert.match(content, /^# Meu projeto/);
    assert.match(content, /Instruções existentes\./);
    assert.match(content, /<!-- ok-playbook:include:start -->/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("appendInclude is idempotent — second call does not duplicate", () => {
  const tmp = makeTmp();
  try {
    appendInclude(tmp);
    appendInclude(tmp);
    const content = readFileSync(join(tmp, "CLAUDE.md"), "utf8");
    const matches = content.match(/<!-- ok-playbook:include:start -->/g) || [];
    assert.equal(matches.length, 1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("hasInclude returns true when markers present", () => {
  const tmp = makeTmp();
  try {
    assert.equal(hasInclude(tmp), false);
    appendInclude(tmp);
    assert.equal(hasInclude(tmp), true);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("hasInclude returns false if CLAUDE.md missing", () => {
  const tmp = makeTmp();
  try {
    assert.equal(hasInclude(tmp), false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
