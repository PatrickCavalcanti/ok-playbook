// packages/ok-playbook/cli/lib/permissions.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const SETTINGS_REL = [".claude", "settings.json"];
const SNIPPET_REL = ["install", "permissions-snippet.json"];

function readJSON(p, fallback) {
  if (!existsSync(p)) return fallback;
  return JSON.parse(readFileSync(p, "utf8"));
}

function uniqStrings(arr) {
  return Array.from(new Set(arr));
}

export function mergePermissions(projectRoot, { pkgRoot } = {}) {
  if (!pkgRoot) {
    throw new Error("mergePermissions: 'pkgRoot' é obrigatório (path do ok-playbook instalado)");
  }
  const snippetPath = join(pkgRoot, ...SNIPPET_REL);
  const snippet = readJSON(snippetPath);
  if (!snippet) {
    throw new Error(`Snippet de permissões não encontrado em ${snippetPath}`);
  }

  const settingsPath = join(projectRoot, ...SETTINGS_REL);
  const settings = readJSON(settingsPath, {});

  settings.permissions ??= {};
  settings.permissions.allow = uniqStrings([
    ...(settings.permissions.allow ?? []),
    ...(snippet.permissions?.allow ?? []),
  ]);

  if (snippet.hooks) {
    settings.hooks ??= {};
    for (const event of Object.keys(snippet.hooks)) {
      settings.hooks[event] ??= [];
      const existingCmds = new Set(
        settings.hooks[event].flatMap((h) => (h.hooks ?? []).map((x) => x.command)),
      );
      for (const entry of snippet.hooks[event]) {
        const entryCmds = (entry.hooks ?? []).map((x) => x.command);
        const allPresent = entryCmds.every((c) => existingCmds.has(c));
        if (!allPresent) {
          settings.hooks[event].push(entry);
        }
      }
    }
  }

  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
  return { written: true };
}
