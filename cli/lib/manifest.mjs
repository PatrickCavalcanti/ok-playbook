// packages/ok-playbook/cli/lib/manifest.mjs
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MANIFEST = "OKPLAYBOOK.md";

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function writeManifest(projectRoot, { version } = {}) {
  if (!version) throw new Error("writeManifest: 'version' é obrigatório");

  const dest = join(projectRoot, MANIFEST);
  if (existsSync(dest)) {
    const histDir = join(projectRoot, "OKPLAYBOOK.history");
    mkdirSync(histDir, { recursive: true });
    renameSync(dest, join(histDir, `${nowStamp()}.md`));
  }

  const today = new Date().toISOString().slice(0, 10);
  const body = [
    "# ok-playbook — manifesto de instalação",
    "",
    `- Versão: ${version}`,
    `- Data: ${today}`,
    "- Componentes ativos: patterns, agents, templates (MVP — tudo via node_modules)",
    "- Paths: ver `ok-playbook.config.json`",
    "- Modo de contribuição upstream: unknown",
    "",
    "## Como atualizar",
    "",
    "```",
    "pnpm up ok-playbook",
    "pnpm exec ok-playbook init   # re-roda (idempotente)",
    "```",
    "",
    "Detalhes em `node_modules/ok-playbook/README.md`.",
    "",
  ].join("\n");

  writeFileSync(dest, body, "utf8");
  return { written: true };
}
