// packages/ok-playbook/cli/lib/__tests__/folders.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

import { scaffoldFolders } from "../folders.mjs";
import { defaultPaths } from "../paths.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, "..", "..", "..");

function makeTmp() {
  return mkdtempSync(join(tmpdir(), "okplaybook-folders-"));
}

test("scaffoldFolders cria 5 pastas-base com templates", () => {
  const tmp = makeTmp();
  try {
    scaffoldFolders(tmp, { paths: defaultPaths(), pkgRoot: PKG_ROOT });

    assert.ok(existsSync(join(tmp, "docs/agent-feedback/_template.md")));
    assert.ok(existsSync(join(tmp, "docs/_drafts/_template.md")));
    assert.ok(existsSync(join(tmp, "docs/insights/_template.md")));
    assert.ok(existsSync(join(tmp, "docs/pendencias/_template.md")));
    assert.ok(existsSync(join(tmp, "docs/superpowers/drafts/.gitkeep")));
    assert.ok(existsSync(join(tmp, "docs/superpowers/specs/done/.gitkeep")));
    assert.ok(existsSync(join(tmp, "docs/superpowers/plans/done/.gitkeep")));
    assert.ok(existsSync(join(tmp, "docs/project-architecture/_index.md")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("scaffoldFolders não sobrescreve templates existentes", () => {
  const tmp = makeTmp();
  try {
    const backlogTpl = join(tmp, "docs/agent-feedback/_template.md");
    mkdirSync(dirname(backlogTpl), { recursive: true });
    writeFileSync(backlogTpl, "CUSTOM CONTENT");

    scaffoldFolders(tmp, { paths: defaultPaths(), pkgRoot: PKG_ROOT });
    assert.equal(readFileSync(backlogTpl, "utf8"), "CUSTOM CONTENT");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("scaffoldFolders é idempotente", () => {
  const tmp = makeTmp();
  try {
    scaffoldFolders(tmp, { paths: defaultPaths(), pkgRoot: PKG_ROOT });
    scaffoldFolders(tmp, { paths: defaultPaths(), pkgRoot: PKG_ROOT });
    assert.ok(existsSync(join(tmp, "docs/agent-feedback/_template.md")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
