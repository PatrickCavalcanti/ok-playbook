// packages/ok-playbook/cli/lib/__tests__/permissions.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

import { mergePermissions } from "../permissions.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, "..", "..", "..");

function makeTmp() {
  return mkdtempSync(join(tmpdir(), "okplaybook-perms-"));
}

test("mergePermissions creates .claude/settings.json if missing", () => {
  const tmp = makeTmp();
  try {
    mergePermissions(tmp, { pkgRoot: PKG_ROOT });
    const p = join(tmp, ".claude", "settings.json");
    assert.ok(existsSync(p), "settings.json should be created");
    const settings = JSON.parse(readFileSync(p, "utf8"));
    assert.ok(Array.isArray(settings.permissions.allow));
    assert.ok(settings.permissions.allow.includes("Bash(git *)"));
    assert.ok(settings.hooks?.PreToolUse);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("mergePermissions preserves existing settings keys", () => {
  const tmp = makeTmp();
  try {
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(
      join(tmp, ".claude", "settings.json"),
      JSON.stringify({ model: "opus", permissions: { allow: ["Bash(my-cmd *)"] } }),
    );
    mergePermissions(tmp, { pkgRoot: PKG_ROOT });
    const settings = JSON.parse(readFileSync(join(tmp, ".claude", "settings.json"), "utf8"));
    assert.equal(settings.model, "opus", "should preserve unrelated keys");
    assert.ok(settings.permissions.allow.includes("Bash(my-cmd *)"), "should preserve existing allow");
    assert.ok(settings.permissions.allow.includes("Bash(git *)"), "should add playbook allow");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("mergePermissions deduplicates allow entries", () => {
  const tmp = makeTmp();
  try {
    mkdirSync(join(tmp, ".claude"), { recursive: true });
    writeFileSync(
      join(tmp, ".claude", "settings.json"),
      JSON.stringify({ permissions: { allow: ["Bash(git *)"] } }),
    );
    mergePermissions(tmp, { pkgRoot: PKG_ROOT });
    const settings = JSON.parse(readFileSync(join(tmp, ".claude", "settings.json"), "utf8"));
    const gitMatches = settings.permissions.allow.filter((s) => s === "Bash(git *)");
    assert.equal(gitMatches.length, 1, "should not duplicate Bash(git *)");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("mergePermissions is idempotent", () => {
  const tmp = makeTmp();
  try {
    mergePermissions(tmp, { pkgRoot: PKG_ROOT });
    const first = readFileSync(join(tmp, ".claude", "settings.json"), "utf8");
    mergePermissions(tmp, { pkgRoot: PKG_ROOT });
    const second = readFileSync(join(tmp, ".claude", "settings.json"), "utf8");
    assert.equal(first, second);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
