// packages/ok-playbook/cli/lib/paths.mjs
import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";

export function findProjectRoot(startDir) {
  let current = startDir;
  const { root } = parse(current);
  while (true) {
    if (existsSync(join(current, "package.json"))) return current;
    if (current === root) {
      throw new Error(
        `package.json não encontrado a partir de ${startDir}. Rode 'ok-playbook init' na raiz de um projeto Node.`,
      );
    }
    current = dirname(current);
  }
}

export function defaultPaths() {
  return {
    docs: "docs/",
    arch: "docs/project-architecture/",
    agents: "docs/project-architecture/agents/",
    superpowers: "docs/superpowers/",
    backlog: "docs/agent-feedback/",
    drafts: "docs/_drafts/",
    insights: "docs/insights/",
    pendencias: "docs/pendencias/",
  };
}
