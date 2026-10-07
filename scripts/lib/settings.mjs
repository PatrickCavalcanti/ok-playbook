// Merge único do snippet em .claude/settings.json: respeita BOM, EOL, indentação
// e o que o dono removeu depois (registro em manifesto.settings).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { semBom } from './render.mjs';

const BOM = '\uFEFF';

// Lê e valida ANTES de qualquer escrita. Lança Error se não for JSON de objeto.
export function lerSettings(projeto) {
  const caminho = join(projeto, '.claude/settings.json');
  if (!existsSync(caminho)) return { caminho, existe: false, obj: {}, bom: false, crlf: false, indent: 2, final: true };
  const bruto = readFileSync(caminho, 'utf8');
  const texto = semBom(bruto);
  let obj;
  try { obj = JSON.parse(texto); } catch (e) { throw new Error(e.message); }
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('a raiz precisa ser um objeto');
  const ind = texto.match(/^([ \t]+)\S/m)?.[1];
  const indent = ind == null ? 2 : ind.includes('\t') ? '\t' : ind.length;
  return { caminho, existe: true, obj, bom: bruto.startsWith(BOM), crlf: bruto.includes('\r\n'), indent, final: /\n$/.test(texto) };
}

const registroDe = (m) => ({ allow: [...(m.settings?.allow ?? [])], deny: [...(m.settings?.deny ?? [])], hooks: [...(m.settings?.hooks ?? [])] });
const uniao = (a, b) => [...a, ...b.filter((x) => !a.includes(x))];

// Acrescenta só o que o playbook ainda não ofereceu; atualiza m.settings.
export function mesclarSettings(lido, doSnippet, m) {
  const reg = registroDe(m);
  const atual = lido.obj;
  let mudou = false;
  const novo = doSnippet.permissions ?? {};
  for (const k of ['allow', 'deny']) {
    const lista = atual.permissions?.[k] ?? [];
    for (const r of novo[k] ?? []) {
      if (reg[k].includes(r) || lista.includes(r)) continue;
      lista.push(r);
      atual.permissions ??= {};
      atual.permissions[k] = lista;
      mudou = true;
    }
    reg[k] = uniao(reg[k], novo[k] ?? []);
  }
  for (const [evento, entradas] of Object.entries(doSnippet.hooks ?? {})) {
    if (evento.startsWith('_comment') || !Array.isArray(entradas)) continue;
    const lista = atual.hooks?.[evento] ?? [];
    for (const e of entradas) {
      const chave = `${evento}:${e.matcher ?? ''}`;
      if (!reg.hooks.includes(chave) && !lista.some((x) => x.matcher === e.matcher)) {
        lista.push(e);
        atual.hooks ??= {};
        atual.hooks[evento] = lista;
        mudou = true;
      }
      if (!reg.hooks.includes(chave)) reg.hooks.push(chave);
    }
  }
  m.settings = reg;
  if (mudou) gravarSettings(lido);
  return mudou;
}

function gravarSettings(l) {
  mkdirSync(dirname(l.caminho), { recursive: true });
  let t = JSON.stringify(l.obj, null, l.indent);
  if (l.final) t += '\n';
  if (l.crlf) t = t.replace(/\n/g, '\r\n');
  writeFileSync(l.caminho, (l.bom ? BOM : '') + t);
}
