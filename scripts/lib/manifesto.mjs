// Manifesto ok-playbook.json: caminhos do projeto + estado de cada item.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ARQUIVO = 'ok-playbook.json';
export const CHAVES = ['docs', 'arch', 'agents', 'superpowers', 'backlog', 'drafts', 'insights', 'pendencias'];
export const PADRAO = {
  docs: 'docs/', arch: 'docs/project-architecture/', agents: 'docs/project-architecture/agents/',
  superpowers: 'docs/superpowers/', backlog: 'docs/agent-feedback/', drafts: 'docs/_drafts/',
  insights: 'docs/insights/', pendencias: 'docs/pendencias/',
};

const barra = (p) => (p.endsWith('/') ? p : `${p}/`);

export function lerManifesto(projeto) {
  const caminho = join(projeto, ARQUIVO);
  if (!existsSync(caminho)) return null;
  const m = JSON.parse(readFileSync(caminho, 'utf8'));
  m.paths = Object.fromEntries(CHAVES.map((k) => [k, barra((m.paths?.[k] ?? PADRAO[k]).replace(/\\/g, '/'))]));
  m.itens ??= {};
  m.contribuicao ??= 'direct';
  return m;
}

export function gravarManifesto(projeto, m) {
  const ordenado = { ...m, itens: Object.fromEntries(Object.entries(m.itens).sort(([a], [b]) => a.localeCompare(b))) };
  writeFileSync(join(projeto, ARQUIVO), `${JSON.stringify(ordenado, null, 2)}\n`);
}
