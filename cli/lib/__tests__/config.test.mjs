// packages/ok-playbook/cli/lib/__tests__/config.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { writeConfig, readConfig, configExists } from "../config.mjs";

const PKG_VERSION = "0.1.0";

function makeTmp() {
  return mkdtempSync(join(tmpdir(), "okplaybook-config-"));
}

test("writeConfig creates ok-playbook.config.json with defaults", () => {
  const tmp = makeTmp();
  try {
    writeConfig(tmp, { version: PKG_VERSION });
    const raw = readFileSync(join(tmp, "ok-playbook.config.json"), "utf8");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.version, PKG_VERSION);
    assert.equal(parsed.paths.docs, "docs/");
    assert.equal(parsed.paths.backlog, "docs/agent-feedback/");
    assert.equal(typeof parsed.$schema, "string");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("writeConfig does not overwrite existing config unless force=true", () => {
  const tmp = makeTmp();
  try {
    const existing = JSON.stringify({ version: "0.0.9", paths: { docs: "custom/" } });
    writeFileSync(join(tmp, "ok-playbook.config.json"), existing);

    writeConfig(tmp, { version: PKG_VERSION });
    const raw = readFileSync(join(tmp, "ok-playbook.config.json"), "utf8");
    assert.equal(JSON.parse(raw).paths.docs, "custom/", "should preserve custom path");

    writeConfig(tmp, { version: PKG_VERSION, force: true });
    const raw2 = readFileSync(join(tmp, "ok-playbook.config.json"), "utf8");
    assert.equal(JSON.parse(raw2).paths.docs, "docs/", "force should overwrite");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("readConfig returns parsed config", () => {
  const tmp = makeTmp();
  try {
    writeConfig(tmp, { version: PKG_VERSION });
    const cfg = readConfig(tmp);
    assert.equal(cfg.version, PKG_VERSION);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("readConfig throws if config missing", () => {
  const tmp = makeTmp();
  try {
    assert.throws(() => readConfig(tmp), /ok-playbook\.config\.json não encontrado/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("configExists returns true/false correctly", () => {
  const tmp = makeTmp();
  try {
    assert.equal(configExists(tmp), false);
    writeConfig(tmp, { version: PKG_VERSION });
    assert.equal(configExists(tmp), true);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
