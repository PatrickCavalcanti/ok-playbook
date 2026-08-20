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

test("readConfig throws clear error on invalid JSON", () => {
  const tmp = makeTmp();
  try {
    writeFileSync(join(tmp, "ok-playbook.config.json"), "{ not valid json");
    assert.throws(() => readConfig(tmp), /JSON inválido/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("readConfig throws when paths field missing", () => {
  const tmp = makeTmp();
  try {
    writeFileSync(join(tmp, "ok-playbook.config.json"), JSON.stringify({ version: "0.1.0" }));
    assert.throws(() => readConfig(tmp), /sem campo 'paths'/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("readConfig throws when paths incomplete", () => {
  const tmp = makeTmp();
  try {
    writeFileSync(
      join(tmp, "ok-playbook.config.json"),
      JSON.stringify({ version: "0.1.0", paths: { docs: "docs/" } }),
    );
    assert.throws(() => readConfig(tmp), /paths obrigatórios.*arch.*backlog/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("readConfig preenche paths opcionais ausentes (config anterior a 0.4 sem pendencias)", () => {
  const tmp = makeTmp();
  try {
    const antigo = {
      version: "0.3.0",
      paths: {
        docs: "docs/", arch: "docs/project-architecture/", agents: "docs/project-architecture/agents/",
        superpowers: "docs/superpowers/", backlog: "docs/agent-feedback/", drafts: "docs/_drafts/", insights: "docs/insights/",
      },
    };
    writeFileSync(join(tmp, "ok-playbook.config.json"), JSON.stringify(antigo));
    const cfg = readConfig(tmp);
    assert.equal(cfg.paths.pendencias, "docs/pendencias/", "default em memória; init passa a scaffoldar sem --force");
    assert.equal(cfg.paths.docs, "docs/");
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
