// Render: placeholders, bloco entre marcadores, hash.
import { createHash } from 'node:crypto';

export const MARCA_FIM = '<!-- ok-playbook:end -->';
export const marcaInicio = (versao) => `<!-- ok-playbook:start v${versao} -->`;
const RE_BLOCO = /<!-- ok-playbook:start v[^ ]+ -->\r?\n([\s\S]*?)\r?\n<!-- ok-playbook:end -->/;
const RE_LEGADO = /<!-- ok-playbook:include:start -->\r?\n[\s\S]*?\r?\n<!-- ok-playbook:include:end -->/;
const BOM = '﻿';

export const semBom = (t) => (t.startsWith(BOM) ? t.slice(1) : t);
// Forma normalizada (LF, sem BOM) — base do hash e das comparações.
export const lf = (t) => semBom(t).replace(/\r\n/g, '\n');
export const hash = (t) => createHash('sha256').update(lf(t)).digest('hex').slice(0, 16);

// Estilo do arquivo existente: BOM e EOL. Arquivo novo (null) = LF sem BOM.
export const estilo = (t) => ({ bom: t != null && t.startsWith(BOM), crlf: t != null && t.includes('\r\n') });

// Reaplica o estilo do arquivo existente a um texto gerado em LF.
export function adaptar(textoLf, atual) {
  const e = estilo(atual);
  return (e.bom ? BOM : '') + (e.crlf ? textoLf.replace(/\n/g, '\r\n') : textoLf);
}

const conta = (t, re) => (t.match(re) ?? []).length;

// start sem end (ou o contrário): não dá para saber o que é do playbook.
export function blocoQuebrado(texto) {
  const t = texto ?? '';
  return conta(t, /<!-- ok-playbook:start v[^ ]+ -->/g) !== conta(t, /<!-- ok-playbook:end -->/g)
    || conta(t, /<!-- ok-playbook:include:start -->/g) !== conta(t, /<!-- ok-playbook:include:end -->/g);
}

export function resolverPlaceholders(texto, paths) {
  let t = lf(texto);
  t = t.replace(/<playbook-root>agents\/([a-z0-9-]+)\.md/g, '.claude/skills/$1/SKILL.md');
  const mapa = {
    'playbook-root': `${paths.docs}ok-playbook/`,
    'docs-root': paths.docs,
    'arch-root': paths.arch,
    'agents-root': paths.agents,
    'superpowers-root': paths.superpowers,
    'backlog-root': paths.backlog,
    'drafts-root': paths.drafts,
    'insights-root': paths.insights,
    'pendencias-root': paths.pendencias,
  };
  // os valores já terminam em `/`: `<x-root>/` não pode virar `//`
  for (const [nome, valor] of Object.entries(mapa)) t = t.split(`<${nome}>/`).join(valor).split(`<${nome}>`).join(valor);
  return t;
}

export function temLegado(texto) {
  return RE_LEGADO.test(lf(texto ?? ''));
}

export function extrairBloco(texto) {
  const m = lf(texto ?? '').match(RE_BLOCO);
  return m ? m[1] : null;
}

export function inserirBloco(atual, conteudo, versao) {
  const bruto = atual ?? '';
  const bom = bruto.startsWith(BOM) ? BOM : '';
  const t = semBom(bruto);
  const eol = t.includes('\r\n') ? '\r\n' : '\n';
  const bloco = `${marcaInicio(versao)}\n${conteudo}\n${MARCA_FIM}`.replace(/\r?\n/g, eol);
  // só o trecho do bloco muda; o resto do arquivo segue byte a byte
  if (RE_BLOCO.test(t)) return bom + t.replace(RE_BLOCO, () => bloco);
  if (RE_LEGADO.test(t)) return bom + t.replace(RE_LEGADO, () => bloco);
  return bom + (t ? `${bloco}${eol}${eol}${t}` : `${bloco}${eol}`);
}

export function renderSkill(nome, texto, paths) {
  const t = resolverPlaceholders(texto, paths);
  const m = t.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error(`protocolo ${nome} sem frontmatter`);
  const campos = m[1].split('\n').filter((l) => /^(description|when_to_use):/.test(l));
  if (!campos.some((l) => l.startsWith('description:'))) throw new Error(`protocolo ${nome} sem description`);
  return `---\nname: ${nome}\n${campos.join('\n')}\n---\n${t.slice(m[0].length)}`;
}
