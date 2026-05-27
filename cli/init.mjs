// packages/ok-playbook/cli/init.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { findProjectRoot } from "./lib/paths.mjs";
import { writeConfig, readConfig, configExists } from "./lib/config.mjs";
import { appendInclude, hasInclude } from "./lib/include.mjs";
import { mergePermissions } from "./lib/permissions.mjs";
import { scaffoldFolders } from "./lib/folders.mjs";
import { writeManifest } from "./lib/manifest.mjs";

function resolvePkgRoot() {
  const here = dirname(fileURLToPath(import.meta.url));
  return dirname(here);
}

function readPkgVersion(pkgRoot) {
  const pkg = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8"));
  return pkg.version;
}

function log(silent, msg) {
  if (!silent) process.stdout.write(msg + "\n");
}

export async function runInit({ argv = [], cwd, pkgRoot, silent = false } = {}) {
  const force = argv.includes("--force");
  const projectRoot = findProjectRoot(cwd);
  const resolvedPkgRoot = pkgRoot ?? resolvePkgRoot();
  const version = readPkgVersion(resolvedPkgRoot);

  log(silent, `ok-playbook init em ${projectRoot} (versão ${version})`);

  const cfg = writeConfig(projectRoot, { version, force });
  log(silent, cfg.written ? "  ✓ ok-playbook.config.json criado" : `  · config preservado (${cfg.reason})`);

  const inc = appendInclude(projectRoot);
  log(silent, inc.written ? "  ✓ include adicionado ao CLAUDE.md" : `  · CLAUDE.md já tem include (${inc.reason})`);

  mergePermissions(projectRoot, { pkgRoot: resolvedPkgRoot });
  log(silent, "  ✓ permissões mescladas em .claude/settings.json");

  const paths = (configExists(projectRoot) ? readConfig(projectRoot).paths : null);
  scaffoldFolders(projectRoot, { paths, pkgRoot: resolvedPkgRoot });
  log(silent, "  ✓ pastas e templates escaffoldados");

  writeManifest(projectRoot, { version });
  log(silent, "  ✓ OKPLAYBOOK.md gerado");

  log(silent, "");
  log(silent, "Próximo passo: leia OKPLAYBOOK.md e edite ok-playbook.config.json se quiser customizar paths.");
}
