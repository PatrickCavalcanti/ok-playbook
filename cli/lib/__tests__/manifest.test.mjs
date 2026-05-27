// packages/ok-playbook/cli/lib/__tests__/manifest.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { writeManifest } from "../manifest.mjs";

function makeTmp() {
  return mkdtempSync(join(tmpdir(), "okplaybook-manifest-"));
}

test("writeManifest cria OKPLAYBOOK.md com versão e contribution unknown", () => {
  const tmp = makeTmp();
  try {
    writeManifest(tmp, { version: "0.1.0" });
    const content = readFileSync(join(tmp, "OKPLAYBOOK.md"), "utf8");
    assert.match(content, /Versão.*0\.1\.0/);
    assert.match(content, /Modo de contribuição upstream.*unknown/);
    assert.match(content, /paths/i);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("writeManifest preserva manifesto existente em OKPLAYBOOK.history/", () => {
  const tmp = makeTmp();
  try {
    writeFileSync(join(tmp, "OKPLAYBOOK.md"), "# Manifesto antigo\n");
    writeManifest(tmp, { version: "0.1.0" });
    assert.ok(existsSync(join(tmp, "OKPLAYBOOK.md")));
    const content = readFileSync(join(tmp, "OKPLAYBOOK.md"), "utf8");
    assert.match(content, /Versão.*0\.1\.0/);
    assert.doesNotMatch(content, /Manifesto antigo/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
