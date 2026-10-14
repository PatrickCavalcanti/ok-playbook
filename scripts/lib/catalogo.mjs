// Catálogo: tudo que a skill materializa, já renderizado para este projeto.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { lf, renderSkill, resolverPlaceholders } from './render.mjs';

function listar(raiz, rel) {
  const dir = join(raiz, rel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const r = `${rel}/${n}`;
    return statSync(join(raiz, r)).isDirectory() ? listar(raiz, r) : [r];
  });
}

const SEMENTES = [
  ['feedback.md', 'backlog', '_template.md'],
  ['draft.md', 'drafts', '_template.md'],
  ['insight.md', 'insights', '_template.md'],
  ['pendencias.template.md', 'pendencias', '_template.md'],
  ['_index.template.md', 'arch', '_index.md'],
];

export function catalogo(raizSkill, paths) {
  const ler = (r) => readFileSync(join(raizSkill, r), 'utf8');
  const itens = [];
  const add = (id, tipo, destino, origem, conteudo) =>
    itens.push({ id, tipo, destino, origem, fonte: ler(origem), conteudo });

  const regras = resolverPlaceholders(ler('assets/rules.md'), paths, 'CLAUDE.md').trim();
  for (const arq of ['CLAUDE.md', 'AGENTS.md']) add(`regras:${arq}`, 'bloco', arq, 'assets/rules.md', regras);

  for (const origem of listar(raizSkill, 'references/agents').filter((r) => r.endsWith('.md'))) {
    const nome = origem.split('/').pop().replace(/\.md$/, '');
    // .claude/skills e .agents/skills têm a mesma profundidade: o mesmo texto serve às duas
    const conteudo = renderSkill(nome, ler(origem), paths, `.claude/skills/${nome}/SKILL.md`);
    for (const base of ['.claude/skills', '.agents/skills'])
      add(`skill:${base}/${nome}`, 'arquivo', `${base}/${nome}/SKILL.md`, origem, conteudo);
  }

  for (const origem of listar(raizSkill, 'references/patterns')) {
    const destino = `${paths.docs}ok-playbook/patterns/${origem.slice('references/patterns/'.length)}`;
    add(`pattern:${origem.split('/').pop()}`, 'arquivo', destino, origem, resolverPlaceholders(ler(origem), paths, destino));
  }

  for (const origem of listar(raizSkill, 'assets/templates')) {
    const destino = `${paths.docs}ok-playbook/templates/${origem.slice('assets/templates/'.length)}`;
    add(`template:${origem.split('/').pop()}`, 'arquivo', destino, origem, resolverPlaceholders(ler(origem), paths, destino));
  }

  // hooks: conteúdo idêntico em qualquer checkout (a raiz é calculada em tempo de execução)
  for (const origem of listar(raizSkill, 'assets/hooks')) {
    const rel = origem.slice('assets/hooks/'.length);
    add(`hook:${rel}`, 'arquivo', `.claude/hooks/${rel}`, origem, lf(ler(origem)));
  }

  for (const [tpl, chave, nomeDestino] of SEMENTES) {
    const origem = `assets/templates/${tpl}`;
    if (!existsSync(join(raizSkill, origem))) continue;
    const destino = `${paths[chave]}${nomeDestino}`;
    add(`semente:${chave}`, 'semente', destino, origem, resolverPlaceholders(ler(origem), paths, destino));
  }
  return itens;
}
