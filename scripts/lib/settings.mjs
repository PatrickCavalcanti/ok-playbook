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

const registroDe = (m) => ({
  allow: [...(m.settings?.allow ?? [])], deny: [...(m.settings?.deny ?? [])], hooks: [...(m.settings?.hooks ?? [])],
  // legado já tratado (regras e nomes de hook 0.x): o que o dono re-adicionar depois não é removido de novo
  legado: { allow: [...(m.settings?.legado?.allow ?? [])], hooks: [...(m.settings?.legado?.hooks ?? [])] },
});
const uniao = (a, b) => [...a, ...b.filter((x) => !a.includes(x))];

// Nomes de arquivo citados num comando de hook ("node ${X}/.claude/hooks/a.js" → ["node", "a.js", …]).
const arquivosDe = (cmd) => String(cmd ?? '').split(/[\s"'\\/]+/).filter(Boolean);

// Troca hooks 0.x pelo canônico do mesmo matcher. Só troca se o arquivo canônico vai existir
// (item hook:<arquivo> não excluído, ou arquivo já no disco); senão mantém e não registra como tratado.
// Se o canônico já está em QUALQUER entrada do evento com o mesmo matcher, o legado só sai.
// Devolve { relato, mantidos } — mantidos = nomes legados que ficaram.
function limparHooksLegados(atual, doSnippet, nomes, m, dirHooks) {
  const relato = [];
  const mantidos = new Set();
  for (const [evento, entradas] of Object.entries(atual.hooks ?? {})) {
    if (!Array.isArray(entradas)) continue;
    for (const entrada of [...entradas]) {
      if (!Array.isArray(entrada?.hooks)) continue;
      const canonico = (doSnippet.hooks?.[evento] ?? []).find((x) => x.matcher === entrada.matcher)?.hooks?.find((h) => h.command)?.command;
      if (!canonico) continue;
      const arqCanonico = arquivosDe(canonico).filter((a) => /.(m?js|cjs)$/.test(a));
      const mesmoMatcher = entradas.filter((x) => x.matcher === entrada.matcher && Array.isArray(x.hooks));
      for (const h of [...entrada.hooks]) {
        const legados = arquivosDe(h?.command).filter((a) => nomes.includes(a));
        if (!legados.length) continue;
        const jaTem = mesmoMatcher.some((x) => x.hooks.some((y) => y !== h && (y.command === canonico || arquivosDe(y?.command).some((a) => arqCanonico.includes(a)))));
        if (jaTem) {
          entrada.hooks.splice(entrada.hooks.indexOf(h), 1);
          relato.push(`hook legado removido (canônico já presente): ${h.command}`);
          if (!entrada.hooks.length) entradas.splice(entradas.indexOf(entrada), 1);
          continue;
        }
        const existira = arqCanonico.every((a) => m.itens?.[`hook:${a}`]?.estado !== 'excluido' || existsSync(join(dirHooks, a)));
        if (!existira) {
          legados.forEach((n) => mantidos.add(n));
          relato.push(`hook legado mantido: canônico excluído do projeto (${arqCanonico.join(', ')})`);
          continue;
        }
        relato.push(`hook legado trocado: ${h.command} → ${canonico}`);
        h.command = canonico;
      }
    }
  }
  return { relato, mantidos };
}

// Acrescenta só o que o playbook ainda não ofereceu; atualiza m.settings. Na primeira vez
// por projeto, também tira o legado 0.x (snippet.legado): regras do allow e hooks trocados
// pelo canônico. Devolve as linhas do que mudou no legado (para o relatório do apply).
export function mesclarSettings(lido, doSnippet, m) {
  const reg = registroDe(m);
  const atual = lido.obj;
  let mudou = false;
  const relato = [];
  const legado = doSnippet.legado ?? {};
  const regras = (legado.allow ?? []).filter((r) => !reg.legado.allow.includes(r));
  for (const r of regras) {
    const lista = atual.permissions?.allow;
    if (Array.isArray(lista) && lista.includes(r)) {
      atual.permissions.allow = lista.filter((x) => x !== r);
      relato.push(`removido allow ${r}`);
      mudou = true;
    }
  }
  reg.legado.allow = uniao(reg.legado.allow, regras);
  const nomes = (legado.hooks ?? []).filter((n) => !reg.legado.hooks.includes(n));
  const dirHooks = join(dirname(lido.caminho), 'hooks');
  let mantidos = new Set();
  if (nomes.length) {
    const r = limparHooksLegados(atual, doSnippet, nomes, m, dirHooks);
    mantidos = r.mantidos;
    if (r.relato.some((l) => !l.startsWith('hook legado mantido'))) mudou = true;
    relato.push(...r.relato);
    reg.legado.hooks = uniao(reg.legado.hooks, nomes.filter((n) => !mantidos.has(n)));
  }
  // arquivo de hook 0.x ainda no disco: não apaga, só avisa (o agente remove); hook que ficou em uso não avisa
  for (const n of legado.hooks ?? []) if (!mantidos.has(n) && existsSync(join(dirHooks, n))) relato.push(`arquivo de hook legado no disco, remova: .claude/hooks/${n}`);
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
  return relato;
}

function gravarSettings(l) {
  mkdirSync(dirname(l.caminho), { recursive: true });
  let t = JSON.stringify(l.obj, null, l.indent);
  if (l.final) t += '\n';
  if (l.crlf) t = t.replace(/\n/g, '\r\n');
  writeFileSync(l.caminho, (l.bom ? BOM : '') + t);
}
