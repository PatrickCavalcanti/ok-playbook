// Render: placeholders, bloco entre marcadores, hash.
import { createHash } from 'node:crypto';

export const MARCA_FIM = '<!-- ok-playbook:end -->';
export const marcaInicio = (versao) => `<!-- ok-playbook:start v${versao} -->`;
const RE_BLOCO = /<!-- ok-playbook:start v[^ ]+ -->\n([\s\S]*?)\n<!-- ok-playbook:end -->/;
const RE_LEGADO = /<!-- ok-playbook:include:start -->\n[\s\S]*?\n<!-- ok-playbook:include:end -->/;

export const lf = (t) => t.replace(/\r\n/g, '\n');
export const hash = (t) => createHash('sha256').update(lf(t)).digest('hex').slice(0, 16);

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
  for (const [nome, valor] of Object.entries(mapa)) t = t.split(`<${nome}>`).join(valor);
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
  const bloco = `${marcaInicio(versao)}\n${conteudo}\n${MARCA_FIM}`;
  const t = lf(atual ?? '');
  if (RE_BLOCO.test(t)) return t.replace(RE_BLOCO, () => bloco);
  if (RE_LEGADO.test(t)) return t.replace(RE_LEGADO, () => bloco);
  return t ? `${bloco}\n\n${t}` : `${bloco}\n`;
}

export function renderSkill(nome, texto, paths) {
  const t = resolverPlaceholders(texto, paths);
  const m = t.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error(`protocolo ${nome} sem frontmatter`);
  const campos = m[1].split('\n').filter((l) => /^(description|when_to_use):/.test(l));
  if (!campos.some((l) => l.startsWith('description:'))) throw new Error(`protocolo ${nome} sem description`);
  return `---\nname: ${nome}\n${campos.join('\n')}\n---\n${t.slice(m[0].length)}`;
}
