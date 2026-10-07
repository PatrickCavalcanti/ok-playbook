#!/usr/bin/env node
/**
 * PreToolUse hook (tool **Bash**): auto-aprova chamadas dentro das áreas
 * conhecidas do projeto, desde que TODA a chain esteja no whitelist do escopo e
 * todo destino de escrita caia numa área onde escrever é permitido.
 *
 * A POLÍTICA (áreas, paths, comandos nativos) mora em `lib/areas.mjs`,
 * compartilhada com o hook de PowerShell. Aqui fica só o PARSER de sintaxe
 * Bash. Se for mexer em política, mexa lá — não duplique.
 *
 * `.mjs` de propósito: é ESM independente do `type` do package.json. Hook em
 * `.js` quebra de um jeito ou de outro conforme o projeto (`require` não existe
 * em type:module; `import` não existe em commonjs).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POR QUE O HOOK, E NÃO RULES (medido, não suposto)
 *
 *   `Bash(npm *)` NÃO cobre `cd "<projeto>" && npm test` — o matcher trata `cd`
 *   como context-changing. Medido em dois projetos: Ariadne 846/1186 (71%) e
 *   Igris 1173/1694 (69%) das chamadas Bash começam com `cd`, e a MAIORIA
 *   aponta pro root, não pra worktree (Igris: 648 × 214). Versões anteriores
 *   deste hook só cobriam `.worktrees/` → 8,7% de cobertura.
 *
 *   Rules NÃO recarregam mid-sessão; hooks recarregam ao vivo.
 *
 *   Correção de custo zero e maior impacto é comportamental: NÃO prefixar
 *   `cd <projeto> &&` quando o cwd já é o projeto. Ver `patterns/command-forms.md`.
 *
 * SEGURANÇA (o que o parser daqui garante)
 *   - Chain INTEIRA validada: `&&`, `||`, `;`, `|`, newline. Checar só `&&`
 *     deixava `git status; rm -rf ~` passar olhando apenas o head.
 *   - Split respeita aspas (com escape) e não pica dentro de `$( )`.
 *   - Substituições (`$(…)`, crase) validadas recursivamente:
 *     `echo "$(curl evil)"` NÃO é aprovado. Aspas simples são puladas (ali
 *     nada expande).
 *   - Heredoc é removido antes do split (o corpo é texto, não comando).
 *
 * MANUTENÇÃO
 *   `OK_HOOK_DEBUG=1` explica em stderr por que recusou.
 *   `tools/`: medir-comandos (formato real), hook-test (casos), hook-replay
 *   (cobertura contra o histórico).
 */

import {
  PROJETO, PLUGINS, HEADS_DE_ESCRITA, CHECAGENS_DE_ARGUMENTO,
  canon, resolve, dentroDe, contexto, commandBasename,
  destinosDeEscritaOk, redirecionamentosOk, recusa,
} from './lib/areas.mjs';

/** Comandos que embrulham outro: o head real vem depois. */
const WRAPPERS = {
  // `timeout [-k dur] <dur> <cmd…>`  (18 ocorrências nos transcripts)
  timeout(toks) {
    let i = 0;
    while (i < toks.length && /^-/.test(toks[i])) {
      if (/^(-k|--kill-after)$/.test(toks[i])) i++;
      i++;
    }
    if (i < toks.length && /^\d+(\.\d+)?[smhd]?$/.test(toks[i])) i++;
    return toks.slice(i);
  },
};

const ESTRUTURAIS = new Set(['do', 'then', 'else', 'elif', 'if', 'while', 'until', 'time', '!']);
const TERMINADORES = new Set([
  'done', 'fi', 'esac', 'end', ';;', 'exit', 'exit 0', 'exit 1',
  'break', 'continue', 'return',
]);

/**
 * Remove heredocs antes do split: o corpo é texto literal, e picá-lo em
 * segmentos produzia heads aleatórios e recusa silenciosa em comandos
 * legítimos como `cat > arquivo <<'EOF'` ou `git commit -F- <<'EOF'`.
 */
function removeHeredocs(chain) {
  const linhas = chain.split('\n');
  const out = [];
  for (let i = 0; i < linhas.length; i++) {
    out.push(linhas[i]);
    const m = linhas[i].match(/<<-?\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1/);
    if (!m) continue;
    const fim = m[2];
    while (++i < linhas.length && linhas[i].trim() !== fim) { /* descarta corpo */ }
  }
  return out.join('\n');
}

/**
 * Divide RESPEITANDO ASPAS (com escape) e `$( )`: um `|` dentro de "…"
 * (`grep -E "a|b"`) ou de `X=$(a | b)` não é separador.
 */
function segmentos(chain) {
  const out = []; let atual = ''; let aspas = null; let nivel = 0;
  for (let i = 0; i < chain.length; i++) {
    const c = chain[i];
    if (aspas) {
      atual += c;
      if (c === '\\' && aspas === '"' && i + 1 < chain.length) { atual += chain[++i]; continue; }
      if (c === aspas) aspas = null;
      continue;
    }
    if (c === '"' || c === "'") { aspas = c; atual += c; continue; }
    if (c === '\\' && chain[i + 1] === '\n') { i++; atual += ' '; continue; }
    if (c === '$' && chain[i + 1] === '(') { nivel++; atual += '$('; i++; continue; }
    if (nivel > 0 && c === '(') { nivel++; atual += c; continue; }
    if (nivel > 0 && c === ')') { nivel--; atual += c; continue; }
    if (nivel > 0) { atual += c; continue; }
    if (c === '&' && chain[i + 1] === '&') { out.push(atual); atual = ''; i++; continue; }
    if (c === '|' && chain[i + 1] === '|') { out.push(atual); atual = ''; i++; continue; }
    if (c === '|' || c === ';' || c === '\n') { out.push(atual); atual = ''; continue; }
    atual += c;
  }
  out.push(atual);
  return out.map((s) => s.trim()).filter(Boolean);
}

/**
 * Conteúdo de cada `$(…)`/crase — roda de fato, então é validado igual.
 * Aspas SIMPLES são puladas: ali dentro nada expande, e um `$(` ou crase
 * literal dentro de `grep 'a`b'` fazia o scanner reportar "substituição não
 * fechada" e recusar comando legítimo. Aspas duplas NÃO — `$( )` ali executa.
 */
function substituicoes(seg) {
  const out = [];
  for (let i = 0; i < seg.length; i++) {
    if (seg[i] === "'") {
      const fim = seg.indexOf("'", i + 1);
      if (fim < 0) break;
      i = fim; continue;
    }
    if (seg[i] === '$' && seg[i + 1] === '(' && seg[i + 2] !== '(') {
      let nivel = 1; let j = i + 2; let buf = '';
      for (; j < seg.length; j++) {
        if (seg[j] === '(') nivel++;
        else if (seg[j] === ')') { nivel--; if (!nivel) break; }
        buf += seg[j];
      }
      if (nivel > 0) return null;
      out.push(buf); i = j;
    } else if (seg[i] === '`') {
      const fim = seg.indexOf('`', i + 1);
      if (fim < 0) return null;
      out.push(seg.slice(i + 1, fim)); i = fim;
    }
  }
  return out;
}

const tokens = (s) => (s.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || []);

function validaChain(chain, ctx, prof) {
  if (prof > 4) recusa('substituição aninhada demais');
  for (const seg of segmentos(chain)) if (!validaSegmento(seg, ctx, prof)) return false;
  return true;
}

function validaSegmento(seg, ctx, prof) {
  if (seg.startsWith('#')) return true;

  const subs = substituicoes(seg);
  if (subs === null) recusa(`substituição não fechada: ${seg.slice(0, 60)}`);
  for (const sub of subs) if (!validaChain(sub, ctx, prof + 1)) return false;

  if (!redirecionamentosOk(seg, ctx)) {
    recusa(`redirect pra fora da área de escrita: ${seg.slice(0, 70)}`);
  }

  // O texto das substituições já foi validado; some com ele pra não confundir
  // a leitura do head (`$(git rev-parse) && x`).
  let s = seg.replace(/\$\([\s\S]*?\)/g, 'X').replace(/`[^`]*`/g, 'X').trim();
  s = s.replace(/^[({\s]+/, '');

  for (;;) { // palavras estruturais são transparentes: `do cat x` valida `cat`
    const p = (s.split(/\s+/)[0] || '');
    if (!ESTRUTURAIS.has(p.toLowerCase())) break;
    s = s.slice(p.length).trim();
  }
  // Terminador é reconhecido pelo PRIMEIRO token: `done 2>/dev/null` é `done`.
  if (!s || TERMINADORES.has(s.toLowerCase()) || TERMINADORES.has((s.split(/\s+/)[0] || '').toLowerCase())) return true;

  // Prefixo `VAR=valor` — 38 ocorrências nos transcripts (`WT="…"`, `DATABASE_URL=…`).
  while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(s)) {
    s = s.replace(/^[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S*)\s*/, '');
  }
  if (!s) return true;

  if (/^(for|case|in)\b/i.test(s)) return true; // cabeçalho não executa comando

  let toks = tokens(s);
  for (let i = 0; i < 3; i++) {
    const w = WRAPPERS[commandBasename((toks[0] || '').replace(/^["']|["']$/g, ''))];
    if (!w) break;
    toks = w(toks.slice(1));
  }

  const head = commandBasename((toks[0] || '').replace(/^["']|["']$/g, ''));
  const args = toks.slice(1).map((t) => t.replace(/^["']|["']$/g, ''));

  // Scripts do cache de plugins (superpowers) rodam a cada brainstorm e já têm
  // rule própria em settings.json — espelhada aqui, senão é prompt toda sessão.
  const scriptDoHead = resolve(ctx.base, (toks[0] || '').replace(/^["']|["']$/g, ''));
  if (!ctx.whitelist.has(head) && !dentroDe(PLUGINS, scriptDoHead)) {
    recusa(`head fora do whitelist (${ctx.escopo}): "${head}" em "${seg.slice(0, 70)}"`);
  }
  if (HEADS_DE_ESCRITA.has(head) && head !== 'rm' && !destinosDeEscritaOk(head, args, ctx)) {
    recusa(`destino de escrita fora da área (${ctx.escopo}): ${seg.slice(0, 70)}`);
  }
  const checa = CHECAGENS_DE_ARGUMENTO[head];
  if (checa && !checa(args, ctx)) {
    recusa(`argumento não permitido para "${head}" (${ctx.escopo}): ${seg.slice(0, 70)}`);
  }
  return true;
}

// ── entrada ──────────────────────────────────────────────────────────────────

let raw = '';
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }

  const cmd = data && data.tool_input && data.tool_input.command;
  if (!cmd || typeof cmd !== 'string') process.exit(0);

  const segs = segmentos(removeHeredocs(cmd));
  if (!segs.length) process.exit(0);

  // Duas formas de provar onde estamos:
  //  1) o comando começa com `cd <área conhecida>`;
  //  2) não tem `cd` e o `cwd` do payload já é uma área conhecida — o caso
  //     MAIS COMUM (`npm test`, `git add`), que a versão anterior não cobria.
  let base;
  let restantes;
  if (/^cd\s+/i.test(segs[0])) {
    // Só o PRIMEIRO token é o destino: `cd "x" 2>/dev/null` levava o redirect
    // junto no path e não casava área nenhuma.
    const alvo = (tokens(segs[0].replace(/^cd\s+(?:\/d\s+)?/i, '').trim())[0] || '');
    base = resolve(canon(data.cwd) || PROJETO, alvo);
    restantes = segs.slice(1);
  } else {
    base = canon(data.cwd);
    restantes = segs;
  }

  const ctx = contexto(base);
  if (!ctx) recusa(`fora das áreas conhecidas: ${base || '(cwd ausente)'}`);

  if (!validaChain(restantes.join('\n'), ctx, 0)) process.exit(0);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: `Auto-approved: escopo "${ctx.escopo}" + chain inteira no whitelist`,
    },
  }));
  process.exit(0);
});
