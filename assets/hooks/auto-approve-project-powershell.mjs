#!/usr/bin/env node
/**
 * PreToolUse hook (tool **PowerShell**): irmão do de Bash, mesma política,
 * parser diferente.
 *
 * A POLÍTICA (áreas, paths, comandos nativos) mora em `lib/areas.mjs`. Aqui
 * fica só o parser de sintaxe PowerShell. Se for mexer em política, mexa lá.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POR QUE EXISTE
 *
 *   Medido nos transcripts de um projeto: **376 chamadas PowerShell = 17,1% de todo
 *   o shell da sessão-projeto**, e **56% delas começam com `Set-Location`/`cd`**
 *   — exatamente a mesma doença do Bash (o matcher não casa regra quando o
 *   comando começa com mudança de diretório). Somado a isso, 39 começam com
 *   atribuição (`$x = …`), que esconde o cmdlet do matcher: a regra
 *   `PowerShell(Select-String *)` nunca casa `$prod = (Select-String …)`.
 *   Sem este hook, praticamente toda chamada PowerShell pede permissão.
 *
 * O QUE MUDA EM RELAÇÃO AO BASH
 *
 *   - **Não existe `&&` nem `||`** em PS 5.1 (é erro de parser). Sobram `;`,
 *     `|` e newline como separadores — o parser fica mais simples.
 *   - **A convenção Verbo-Substantivo classifica sozinha.** `Get-`, `Select-`,
 *     `Test-`, `Measure-`, `Where-`, `Format-`… são leitura por construção; não
 *     precisa enumerar whitelist como em Bash. Escrita e destrutivo ficam em
 *     listas explícitas, porque a heurística de verbo erraria (`New-Object` é
 *     inerte, `New-Item` escreve).
 *   - **Variáveis literais são resolvidas.** O idioma dominante aqui é
 *     `$root = "C:\dev\meu-projeto"; … "$root\packages"`. Sem expandir isso,
 *     todo destino viraria "indeterminado" e o hook recusaria quase tudo.
 *     Só literais são expandidos — o que vem de comando continua indeterminado.
 *   - **Parâmetros nomeados.** O destino de `New-Item -Path X -Force` é o valor
 *     de `-Path`, não "todo argumento sem hífen": `-ErrorAction Continue` seria
 *     lido como path se a extração fosse ingênua.
 *
 * ⚠️ ESTADO NÃO PERSISTE ENTRE CHAMADAS. O working directory persiste, mas
 * variáveis e `$env:` não. `$env:DATABASE_URL = …` numa chamada e o teste na
 * chamada seguinte = teste rodou com o valor do `.env`. Atribuição e uso têm
 * que ficar na MESMA chamada — ver `patterns/command-forms.md`.
 *
 * MANUTENÇÃO: `OK_HOOK_DEBUG=1` explica a recusa em stderr.
 */

import {
  PROJETO, HEADS_DE_ESCRITA, CHECAGENS_DE_ARGUMENTO,
  canon, resolve, dentroDeAlguma, contexto, commandBasename,
  destinosDeEscritaOk, redirecionamentosOk, recusa,
} from './lib/areas.mjs';

// ── classificação de cmdlets ─────────────────────────────────────────────────

/** Verbos que só leem/transformam em memória. Cobre a maioria por construção. */
const VERBO_LEITURA = /^(get|select|test|measure|resolve|compare|group|sort|where|foreach|format|convertfrom|convertto|split|read|show|find|search|out|write)-/i;

/** Exceções ao verbo de leitura: `Out-File` escreve, `Write-*` não. */
const EXCECOES_LEITURA = new Set(['out-file', 'out-printer']);

/** Inertes que o verbo classificaria errado (`New-Object` não toca disco). */
const INERTES = new Set([
  'new-object', 'new-timespan', 'new-guid', 'new-variable',
  'set-variable', 'set-alias', 'set-strictmode', 'set-psdebug',
  'write-output', 'write-host', 'write-error', 'write-warning', 'write-verbose',
  'out-null', 'out-string', 'out-host', 'out-default',
  'join-path', 'split-path', 'convertto-json', 'convertfrom-json',
]);

/** Escrevem em disco: o destino precisa cair numa área de escrita. */
const ESCRITA = new Set([
  'new-item', 'set-content', 'add-content', 'out-file', 'copy-item', 'move-item',
  'rename-item', 'set-itemproperty', 'export-csv', 'export-clixml', 'tee-object',
]);

/** Removem: mesma política do `rm` (worktree/scratch livre, root só worktree). */
const REMOCAO = new Set(['remove-item', 'remove-itemproperty', 'clear-content']);

/** Navegação — trata como `cd`. */
const NAVEGACAO = new Set(['set-location', 'push-location', 'pop-location']);

/** Parâmetros cujo valor é um path de destino. */
const PARAM_DESTINO = /^-(path|literalpath|destination|filepath|outfile|target)$/i;

// ── parser ───────────────────────────────────────────────────────────────────

/**
 * Divide em `;`, `|` e newline respeitando aspas (escape é crase em PS),
 * `$(…)`, `@(…)` e blocos `{…}`. NÃO há `&&`/`||` em PS 5.1.
 */
function segmentos(chain) {
  const out = []; let atual = ''; let aspas = null; let nivel = 0;
  for (let i = 0; i < chain.length; i++) {
    const c = chain[i];
    if (aspas) {
      atual += c;
      if (c === '`' && i + 1 < chain.length) { atual += chain[++i]; continue; }
      if (c === aspas) aspas = null;
      continue;
    }
    if (c === '"' || c === "'") { aspas = c; atual += c; continue; }
    if (c === '`' && chain[i + 1] === '\n') { i++; atual += ' '; continue; } // continuação
    if (c === '(' || c === '{' || c === '[') { nivel++; atual += c; continue; }
    if (c === ')' || c === '}' || c === ']') { nivel--; atual += c; continue; }
    if (nivel > 0) { atual += c; continue; }
    if (c === ';' || c === '|' || c === '\n') { out.push(atual); atual = ''; continue; }
    atual += c;
  }
  out.push(atual);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Tokeniza respeitando aspas. */
const tokens = (s) => (s.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || []);

const semAspas = (t) => String(t || '').replace(/^["']|["']$/g, '');

/**
 * Conteúdo executável aninhado: `$(…)`, `@(…)` e blocos `{…}` (de
 * `Where-Object {…}`, `ForEach-Object {…}`, `if {…}`). Tudo isso roda, então é
 * validado como chain. Aspas simples são puladas — ali nada expande.
 */
function aninhados(seg) {
  const out = [];
  for (let i = 0; i < seg.length; i++) {
    if (seg[i] === "'") {
      const fim = seg.indexOf("'", i + 1);
      if (fim < 0) break;
      i = fim; continue;
    }
    const abre = (seg[i] === '$' || seg[i] === '@') && seg[i + 1] === '(';
    if (abre || seg[i] === '{') {
      const fechaCom = seg[i] === '{' ? '}' : ')';
      const abreCom = seg[i] === '{' ? '{' : '(';
      let j = abre ? i + 2 : i + 1; let nivel = 1; let buf = '';
      for (; j < seg.length; j++) {
        if (seg[j] === abreCom) nivel++;
        else if (seg[j] === fechaCom) { nivel--; if (!nivel) break; }
        buf += seg[j];
      }
      if (nivel > 0) return null;
      out.push(buf); i = j;
    }
  }
  return out;
}

/**
 * Expande variáveis cujo valor é literal conhecido. É o que torna o idioma
 * `$root = "E:\…"; … "$root\packages"` verificável — sem isso todo destino
 * seria indeterminado e o hook recusaria quase tudo.
 */
function expande(str, vars) {
  let s = String(str || '');
  for (let i = 0; i < 5 && s.includes('$'); i++) {
    const antes = s;
    s = s.replace(/\$\{?([A-Za-z_]\w*)\}?/g, (m, nome) => {
      const v = vars.get(nome.toLowerCase());
      return v === undefined ? m : v;
    });
    if (s === antes) break;
  }
  return s;
}

/** Coleta `$nome = "literal"` (inclusive compostas de outras já conhecidas). */
function coletaVars(segs) {
  const vars = new Map();
  for (const seg of segs) {
    const m = seg.match(/^\$([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (!m) continue;
    const valor = m[2].trim();
    if (!/^(["']).*\1$/.test(valor)) continue;          // só literal entre aspas
    const cru = semAspas(valor);
    if (/[$](\(|\{?\w+:)/.test(cru)) continue;           // `$(…)` ou `$env:` → não é literal
    const expandido = expande(cru, vars);
    if (expandido.includes('$')) continue;               // sobrou variável desconhecida
    vars.set(m[1].toLowerCase(), expandido);
  }
  return vars;
}

/**
 * Parâmetros que NÃO levam valor. Sem essa lista, `Remove-Item -Force dist`
 * faz o `dist` ser consumido como valor de `-Force`, o destino some, e a
 * checagem de remoção recusa um comando legítimo. PowerShell sabe disso pelo
 * binding do cmdlet; aqui é a aproximação, calibrada pelos switches reais.
 */
const SWITCHES = new Set([
  '-force', '-recurse', '-directory', '-file', '-hidden', '-passthru',
  '-whatif', '-confirm', '-append', '-nonewline', '-quiet', '-wait', '-raw',
  '-resolve', '-all', '-descending', '-unique', '-expandproperty', '-noprofile',
  '-first', '-last', // levam número, mas nunca path — tratar como switch basta
]);

/** Separa parâmetros nomeados de posicionais (switch não consome o seguinte). */
function parametros(toks) {
  const nomeados = new Map(); const posicionais = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (/^-[A-Za-z]/.test(t)) {
      const prox = toks[i + 1];
      if (prox && !/^-[A-Za-z]/.test(prox) && !SWITCHES.has(t.toLowerCase())) {
        nomeados.set(t.toLowerCase(), prox); i++;
      } else nomeados.set(t.toLowerCase(), true);
      continue;
    }
    posicionais.push(t);
  }
  return { nomeados, posicionais };
}

/** Destinos de um cmdlet de escrita/remoção: `-Path`/`-Destination` + posicionais. */
function destinos(toks) {
  const { nomeados, posicionais } = parametros(toks);
  const out = [...posicionais];
  for (const [k, v] of nomeados) if (PARAM_DESTINO.test(k) && typeof v === 'string') out.push(v);
  return out.map(semAspas);
}

function validaChain(chain, ctx, prof) {
  if (prof > 4) recusa('aninhamento demais');
  const segs = segmentos(chain);
  const vars = new Map([...ctx.vars, ...coletaVars(segs)]);
  for (const seg of segs) if (!validaSegmento(seg, { ...ctx, vars }, prof)) return false;
  return true;
}

function validaSegmento(seg, ctx, prof) {
  if (seg.startsWith('#')) return true;

  const dentro = aninhados(seg);
  if (dentro === null) recusa(`bloco não fechado: ${seg.slice(0, 60)}`);
  for (const bloco of dentro) if (!validaChain(bloco, ctx, prof + 1)) return false;

  if (!redirecionamentosOk(expande(seg, ctx.vars), ctx)) {
    recusa(`redirect pra fora da área de escrita: ${seg.slice(0, 70)}`);
  }

  // O conteúdo aninhado já foi validado; some com ele pra ler o head. Some de
  // vez (não vira placeholder): `$failed = @()` deixava um head fantasma.
  let s = seg.replace(/[$@]\([\s\S]*?\)/g, '').replace(/\{[\s\S]*?\}/g, '').trim();

  // Atribuição: `$x = <expr>` — valida o que está à direita (ali é que roda).
  // `$env:X = …` e `$x = "literal"` não executam nada.
  const atrib = s.match(/^\$[\w:]+\s*(?:\+)?=\s*(.*)$/);
  if (atrib) s = atrib[1].trim();
  if (!s) return true;
  s = s.replace(/^[({\s]+/, '');

  // Expressão/propriedade (`$p.LinkType`, `$found.Count`) não executa comando.
  if (s.startsWith('$')) return true;
  // Literal, comparação, operador — inerte.
  if (/^["'@\d]/.test(s) || /^-\w+\b/.test(s)) return true;
  // Entrada de hashtable (`n='cmd'`, `e=…` de `Select-Object @{n=…;e=…}`).
  if (/^[A-Za-z_]\w*\s*=/.test(s)) return true;
  // Cast/propriedade de tipo (`[uri]$prod).UserInfo`) é inerte — MAS chamada
  // estática `[System.IO.Directory]::Delete(…)` apaga de verdade e continua
  // caindo no permission system.
  if (s.startsWith('[')) {
    if (s.includes('::')) recusa(`chamada estática .NET: ${seg.slice(0, 70)}`);
    return true;
  }

  let toks = tokens(s);
  if (toks[0] === '&' || toks[0] === '.') toks = toks.slice(1); // operador de chamada

  const bruto = semAspas(toks[0] || '');
  if (!bruto) return true;
  const nome = bruto.toLowerCase();
  const args = toks.slice(1).map(semAspas);

  // Palavras de controle de fluxo: não executam comando por si.
  if (/^(if|else|elseif|foreach|while|do|try|catch|finally|switch|return|break|continue|param|function)$/.test(nome)) return true;

  const alvos = (lista) => lista.map((a) => resolve(ctx.base, expande(a, ctx.vars)));

  // ── cmdlet Verbo-Substantivo ──────────────────────────────────────────────
  if (/^[a-z]+-[a-z]/i.test(nome)) {
    if (INERTES.has(nome)) return true;

    if (NAVEGACAO.has(nome)) {
      if (nome === 'pop-location') return true;
      const alvo = alvos(destinos(toks.slice(1)))[0];
      if (!dentroDeAlguma(ctx.areas, alvo)) {
        recusa(`navegação pra fora das áreas: ${seg.slice(0, 70)}`);
      }
      return true;
    }

    if (ESCRITA.has(nome)) {
      const ds = alvos(destinos(toks.slice(1)));
      if (!ds.length || !ds.every((d) => dentroDeAlguma(ctx.escrita, d))) {
        recusa(`destino de escrita fora da área (${ctx.escopo}): ${seg.slice(0, 70)}`);
      }
      return true;
    }

    if (REMOCAO.has(nome)) {
      const ds = alvos(destinos(toks.slice(1)));
      if (!CHECAGENS_DE_ARGUMENTO.rm(ds.map((d) => d || '$'), ctx)) {
        recusa(`remoção não permitida (${ctx.escopo}): ${seg.slice(0, 70)}`);
      }
      return true;
    }

    if (VERBO_LEITURA.test(nome) && !EXCECOES_LEITURA.has(nome)) return true;

    recusa(`cmdlet fora da política (${ctx.escopo}): "${nome}" em "${seg.slice(0, 70)}"`);
  }

  // ── comando nativo: usa exatamente a mesma política do hook de Bash ───────
  const head = commandBasename(bruto);
  if (!ctx.whitelist.has(head)) {
    recusa(`head fora do whitelist (${ctx.escopo}): "${head}" em "${seg.slice(0, 70)}"`);
  }
  const argsExp = args.map((a) => expande(a, ctx.vars));
  if (HEADS_DE_ESCRITA.has(head) && head !== 'rm' && !destinosDeEscritaOk(head, argsExp, ctx)) {
    recusa(`destino de escrita fora da área (${ctx.escopo}): ${seg.slice(0, 70)}`);
  }
  const checa = CHECAGENS_DE_ARGUMENTO[head];
  if (checa && !checa(argsExp, ctx)) {
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

  const segs = segmentos(cmd);
  if (!segs.length) process.exit(0);

  const vars = coletaVars(segs);

  // Prova de local: `Set-Location`/`cd`/`sl` no primeiro segmento, ou o `cwd`
  // do payload. 56% das chamadas PS começam com mudança de diretório — é o
  // caso que nenhuma rule cobre.
  let base;
  let restantes;
  const nav = segs[0].match(/^(?:set-location|cd|sl|chdir)\s+(.+)$/i);
  if (nav) {
    const alvo = semAspas(tokens(nav[1])[0] || '');
    base = resolve(canon(data.cwd) || PROJETO, expande(alvo, vars));
    restantes = segs.slice(1);
  } else {
    base = canon(data.cwd);
    restantes = segs;
  }

  const ctx = contexto(base);
  if (!ctx) recusa(`fora das áreas conhecidas: ${base || '(cwd ausente)'}`);
  ctx.vars = vars;

  if (!validaChain(restantes.join('\n'), ctx, 0)) process.exit(0);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: `Auto-approved (PowerShell): escopo "${ctx.escopo}" + chain inteira na política`,
    },
  }));
  process.exit(0);
});
