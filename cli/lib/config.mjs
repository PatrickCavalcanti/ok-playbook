// packages/ok-playbook/cli/lib/config.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { defaultPaths } from "./paths.mjs";

const CONFIG_FILENAME = "ok-playbook.config.json";

export function configExists(projectRoot) {
  return existsSync(join(projectRoot, CONFIG_FILENAME));
}

export function readConfig(projectRoot) {
  const p = join(projectRoot, CONFIG_FILENAME);
  if (!existsSync(p)) {
    throw new Error(`${CONFIG_FILENAME} não encontrado em ${projectRoot}`);
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

export function writeConfig(projectRoot, { version, force = false } = {}) {
  if (!version) throw new Error("writeConfig: 'version' é obrigatório");
  const p = join(projectRoot, CONFIG_FILENAME);
  if (existsSync(p) && !force) {
    return { written: false, reason: "exists" };
  }
  const config = {
    $schema: "./node_modules/ok-playbook/install/ok-playbook.config.schema.json",
    version,
    paths: defaultPaths(),
  };
  writeFileSync(p, JSON.stringify(config, null, 2) + "\n", "utf8");
  return { written: true };
}
