// packages/ok-playbook/cli/lib/__tests__/init.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

import { runInit } from "../../init.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, "..", "..", "..");

function makeProject() {
  const tmp = mkdtempSync(join(tmpdir(), "okplaybook-init-"));
  writeFileSync(join(tmp, "package.json"), JSON.stringify({ name: "test-consumer" }));
  return tmp;
}

test("runInit produz config, include, settings, folders, manifest", async () => {
  const tmp = makeProject();
  try {
    await runInit({ argv: [], cwd: tmp, pkgRoot: PKG_ROOT, silent: true });

    assert.ok(existsSync(join(tmp, "ok-playbook.config.json")), "config");
    assert.ok(existsSync(join(tmp, "CLAUDE.md")), "CLAUDE.md");
    assert.ok(existsSync(join(tmp, ".claude/settings.json")), "settings");
    assert.ok(existsSync(join(tmp, "docs/agent-feedback/_template.md")), "backlog template");
    assert.ok(existsSync(join(tmp, "docs/_drafts/_template.md")), "drafts template");
    assert.ok(existsSync(join(tmp, "docs/insights/_template.md")), "insights template");
    assert.ok(existsSync(join(tmp, "docs/superpowers/plans/done/.gitkeep")), "superpowers");
    assert.ok(existsSync(join(tmp, "OKPLAYBOOK.md")), "manifest");

    const claudeMd = readFileSync(join(tmp, "CLAUDE.md"), "utf8");
    assert.match(claudeMd, /@node_modules\/ok-playbook\/install\/claude-md-include\.md/);

    const manifest = readFileSync(join(tmp, "OKPLAYBOOK.md"), "utf8");
    assert.doesNotMatch(manifest, /Modo de contribuição.*direct|branch-pr|request/);
    assert.match(manifest, /unknown/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("runInit é idempotente — segunda chamada não duplica nada", async () => {
  const tmp = makeProject();
  try {
    await runInit({ argv: [], cwd: tmp, pkgRoot: PKG_ROOT, silent: true });
    const claudeBefore = readFileSync(join(tmp, "CLAUDE.md"), "utf8");
    await runInit({ argv: [], cwd: tmp, pkgRoot: PKG_ROOT, silent: true });
    const claudeAfter = readFileSync(join(tmp, "CLAUDE.md"), "utf8");
    assert.equal(claudeBefore, claudeAfter);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
