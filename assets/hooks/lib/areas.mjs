/**
 * Política de permissão compartilhada pelos hooks de Bash e de PowerShell.
 *
 * O que mora aqui é o que NÃO depende do shell: quais são as áreas, como
 * canonicalizar e comparar path, o que pode escrever onde, e a política dos
 * comandos NATIVOS (git, curl, docker, cmd, rm) — que os dois shells invocam
 * igual. O que fica em cada hook é só o PARSER da sintaxe daquele shell.
 *
 * Esse é o seam certo: se a política morasse duplicada nos dois hooks, ela
 * divergiria — foi exatamente o problema dos dois hooks de Bash que este
 * conjunto substituiu.
 *
 * ─────────────────────────── PARAMETRIZAÇÃO ─────────────────────────────────
 * PROJETO é calculado em tempo de execução (nada a preencher). Ajuste SCRATCH /
 * LEITURA e os whitelists abaixo na instalação, e calibre MEDINDO (`tools/medir-comandos.mjs`), não adivinhando.
 */

import { dirname, resolve as resolverPath } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Path do projeto: ABSOLUTO, lowercase, forward slashes, COM drive.
 *   e:/Projetos/MyApp  →  'e:/projetos/myapp'
 *   /home/user/app     →  '/home/user/app'
 * Calculado a cada execução (CLAUDE_PROJECT_DIR, senão o local deste arquivo):
 * o arquivo é idêntico em qualquer checkout, e worktrees seguem o root que o
 * Claude Code informa.
 * COM drive de propósito: match por sufixo (como versões anteriores faziam)
 * trata um clone do mesmo projeto em outro caminho como se fosse este.
 */
export const PROJETO = canon(
  process.env.CLAUDE_PROJECT_DIR
    // fallback: .claude/hooks/lib/areas.mjs → três níveis acima = raiz do checkout
    || resolverPath(dirname(fileURLToPath(import.meta.url)), '..', '..', '..'),
).replace(/\/\.worktrees\/[^/]+$/, ''); // sessão aberta numa worktree: sobe para a raiz (o ramo `worktree` trata a worktree)

/** Cache de plugins do Claude Code — scripts de skill executam a partir daqui. */
export const PLUGINS = `${(process.env.USERPROFILE || process.env.HOME || '').replace(/\\/g, '/').toLowerCase()}/.claude/plugins`;

/**
 * Descartáveis: escrita livre, de qualquer escopo. `/tmp` do Git Bash aponta
 * pro mesmo lugar que o temp do Windows (ex.: `c:/temp`), mas chega ao hook como path
 * POSIX — as duas formas precisam estar listadas.
 */
export const SCRATCH = [
  '/tmp',
  // + áreas descartáveis próprias do projeto (ex.: 'c:/scratch' no Windows)
  `${(process.env.TEMP || process.env.TMP || '').replace(/\\/g, '/').toLowerCase()}/claude`,
].filter((p) => p && p !== '/claude');

/**
 * Projetos irmãos e caches: leitura livre, escrita nunca.
 * Trabalho que cruza pra cá se resolve com UM artefato — spec/plano escrito lá
 * e executado numa sessão de lá — não com acesso de escrita daqui.
 */
export const LEITURA = [
  `${(process.env.USERPROFILE || process.env.HOME || '').replace(/\\/g, '/').toLowerCase()}/.claude`,
  // + projetos irmãos que este projeto LÊ (paths absolutos, lowercase).
  // Escrita neles NUNCA é auto-aprovada — o padrão é escrever lá UM artefato
  // (spec/plano) e executar numa sessão de lá.
];

// ── whitelists de comando nativo, por escopo ─────────────────────────────────

/** Leitura/inspeção/parse — permitido em TODAS as áreas, inclusive irmãos. */
export const HEADS_LEITURA = new Set([
  'git', 'cd', 'pwd',
  'ls', 'cat', 'find', 'grep', 'egrep', 'fgrep', 'rg', 'head', 'tail', 'less',
  'stat', 'file', 'realpath', 'basename', 'dirname', 'readlink', 'tree',
  'sed', 'awk', 'gawk', 'jq', 'cut', 'tr', 'sort', 'uniq', 'wc', 'nl', 'comm',
  'diff', 'xargs', 'tac', 'rev', 'fold', 'paste', 'column',
  'echo', 'printf', 'date', 'which', 'type', 'true', 'false', 'test', '[',
  'seq', 'read', 'sleep', 'du', 'env', 'printenv', 'expr',
  'tasklist', 'netstat', 'ps', 'where', 'cygpath',
  // interpretadores: as rules já liberam `Bash(python *)` / `Bash(node *)`.
  'node', 'python', 'python3',
  'docker', 'curl',
]);

/** Toolchain + escrita não-destrutiva — nas áreas do projeto e no scratch. */
export const HEADS_PROJETO = new Set([
  ...HEADS_LEITURA,
  'npm', 'pnpm', 'npx', 'tsx', 'tsc', 'vitest', 'vite', 'eslint', 'prettier',
  // + bins reais do projeto (medir-comandos.mjs lista os que aparecem de fato)
  'mkdir', 'cp', 'touch', 'tee', 'mv', 'rm', 'cmd', 'pkill', 'unset',
]);

/** Heads que escrevem: todo alvo precisa cair numa área de escrita. */
export const HEADS_DE_ESCRITA = new Set(['cp', 'mv', 'mkdir', 'touch', 'tee', 'rm']);

// ── debug ────────────────────────────────────────────────────────────────────

const DEBUG = !!process.env.OK_HOOK_DEBUG;

/** Recusa = defer: o hook NUNCA nega, só se cala e devolve ao permission system. */
export function recusa(motivo) {
  if (DEBUG) process.stderr.write(`[hook] recusa: ${motivo}\n`);
  process.exit(0);
}

// ── paths ────────────────────────────────────────────────────────────────────

/**
 * Canonicaliza pra comparação: lowercase, forward slashes, formas MSYS
 * (`/e/x`, `//e/x`) viram `e:/x`, e `.`/`..` são resolvidos textualmente.
 * A resolução de `..` é o que impede `cd <projeto>/../../evil` de ser lido
 * como "dentro do projeto" — match por substring sozinho aceitava.
 */
export function canon(p) {
  let n = String(p == null ? '' : p).trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\/g, '/')
    .toLowerCase();
  if (!n) return '';
  n = n.replace(/^\/\/([a-z])(?=\/)/, '$1:').replace(/^\/([a-z])(?=\/)/, '$1:');
  // Path POSIX-absoluto que NÃO é drive disfarçado (`/tmp`, `/dev/null`): a
  // barra inicial tem que sobreviver, senão vira path relativo e é colado no
  // cwd — `> /tmp/out.txt` era recusado por isso.
  const posix = n.startsWith('/');
  const partes = [];
  const min = posix ? 0 : 1; // na forma com drive, `partes[0]` é o `e:` — não some
  for (const seg of n.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (partes.length > min && partes[partes.length - 1] !== '..') partes.pop();
      else partes.push('..');
      continue;
    }
    partes.push(seg);
  }
  return (posix ? '/' : '') + partes.join('/');
}

export const ehAbsoluto = (p) => /^([a-z]:)?[/\\]/i.test(p) || /^~/.test(p) || /^[a-z]:/i.test(p);

/**
 * Resolve `p` contra `base` (absoluto e já canonicalizado). Devolve null
 * quando o destino não dá pra provar (variável não expandida, `~`).
 */
export function resolve(base, p) {
  const bruto = String(p == null ? '' : p).replace(/^["']|["']$/g, '');
  if (!bruto || bruto.includes('$') || bruto.startsWith('~')) return null;
  return ehAbsoluto(bruto) ? canon(bruto) : canon(`${base}/${bruto}`);
}

export const dentroDe = (area, p) => !!p && (p === area || p.startsWith(`${area}/`));
export const dentroDeAlguma = (areas, p) => areas.some((a) => dentroDe(a, p));
export const ehAlvoDeWorktree = (p) => !!p && p.includes('/.worktrees/');

/**
 * Nome-base do comando: tira caminho (`node_modules/.bin/vitest` → `vitest`),
 * extensão e pontuação de shell grudada. O `)` final vem de subshell e de
 * process substitution (`diff <(… | sort) …`).
 */
export function commandBasename(head) {
  return String(head || '')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[);]+$/, '')
    .replace(/\.(cmd|exe|bin|ps1)$/i, '')
    .toLowerCase();
}

// ── política de git ──────────────────────────────────────────────────────────

/**
 * Subcomandos que mexem no que não é recuperável localmente. Ficam SEMPRE fora
 * do auto-approve — inclusive na worktree, porque `push` atinge o remote
 * (escopo errado pra "liberdade dentro da worktree", worktree.md §6.4).
 * `permissions.deny` cobre os piores; aqui é a segunda linha.
 */
const GIT_PERIGOSO = /^(push|filter-branch|filter-repo)$/;

/** Git de escrita — recusado na área de leitura (projeto irmão). */
const GIT_ESCRITA = /^(commit|add|push|pull|fetch|merge|rebase|reset|checkout|restore|clean|stash|rm|mv|apply|cherry-pick|tag|branch|worktree|init|remote|submodule|switch)$/;

/**
 * Destrutivo NO ROOT — a worktree é descartável, o checkout principal não.
 * Distingue pela FLAG, não pelo subcomando: `git reset` (mixed) é recuperável
 * e `git branch --list` é leitura; tratar o subcomando inteiro como destrutivo
 * gerava prompt em 14 chamadas legítimas do histórico.
 *
 * `checkout`/`switch`/`restore` ficam sempre aqui: além de descartarem working
 * tree, tirar o checkout raiz da branch base é o que quebra sessões paralelas.
 */
function gitDestrutivoNoRoot(sub, args) {
  const tem = (re) => args.some((a) => re.test(a));
  switch (sub) {
    case 'reset': return tem(/^--hard$/);
    case 'clean': return tem(/^-[a-z]*[fdx]/);
    case 'stash': return args.some((a) => /^(drop|clear)$/.test(a));
    case 'checkout': case 'switch': case 'restore': return true;
    // `-d` só apaga branch já mergeada e fecha o cleanup de worktree
    // (worktree.md §9); quem destrói trabalho é `-D`/`--force`.
    case 'branch': return tem(/^(-D|-M|--force)$/);
    default: return false;
  }
}

/** Formas de leitura de subcomandos que também têm forma de escrita. */
function gitSomenteLeitura(sub, args) {
  if (['branch', 'tag', 'stash', 'worktree', 'remote'].includes(sub)) {
    if (args.some((a) => /^(-[dDmMafF]|--delete|--move|--force|--set-upstream)$/.test(a))) return false;
    if (args.some((a) => /^(add|drop|clear|push|pop|prune|remove|set-url|rename)$/.test(a))) return false;
    // `--list <padrão>` e afins são leitura mesmo com argumento posicional.
    if (args.some((a) => /^(--list|-l|--show-current|--contains|--merged|--no-merged|-v|--verbose)$/.test(a))) return true;
    return args.every((a) => /^-/.test(a) || a === sub);
  }
  return false;
}

// ── checagens por argumento (espelham rules limitadas) ───────────────────────

/** Args que são path (descarta flags e `=` de opção longa). */
export const pathArgs = (args) => args.filter((a) => !/^-/.test(a) && !a.includes('='));

/** Tokeniza respeitando aspas — usado pelos dois shells. */
export const tokenize = (s) => (String(s || '').match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || []);

/**
 * Reproduzem as rules que são limitadas por argumento, em vez de liberar o head
 * inteiro. Recebem (args, ctx) e devolvem false pra deferir. `ctx.escrita` são
 * as áreas onde escrever é permitido no escopo corrente.
 */
export const CHECAGENS_DE_ARGUMENTO = {
  // rules: `curl -s http://localhost:*` — só serviço local.
  curl(args) {
    const urls = args.filter((a) => a.includes('://'));
    if (!urls.length) return false;
    return urls.every((u) => /^["']?https?:\/\/(localhost|127\.0\.0\.1)([:/]|["']?$)/i.test(u));
  },
  // rules: `docker exec *` + leitura. Nunca run/rm/build.
  docker(args) {
    return ['logs', 'ps', 'inspect', 'exec'].includes((args[0] || '').toLowerCase());
  },
  // `cd` no meio da chain: destino tem que ficar numa área conhecida.
  cd(args, ctx) {
    const alvo = resolve(ctx.base, (args[0] === '/d' ? args[1] : args[0]) || '');
    return dentroDeAlguma(ctx.areas, alvo);
  },
  git(args, ctx) {
    // `git -C <path> push` — pegar o primeiro não-flag ingenuamente devolveria
    // o PATH como subcomando e deixaria o `push` passar. Flags com valor
    // consomem o token seguinte.
    const COM_VALOR = /^(-C|-c|--git-dir|--work-tree|--namespace|--exec-path)$/;
    let sub = '';
    for (let i = 0; i < args.length; i++) {
      if (COM_VALOR.test(args[i])) { i++; continue; }
      if (/^-/.test(args[i])) continue;
      sub = args[i].toLowerCase();
      break;
    }
    if (GIT_PERIGOSO.test(sub)) return false;
    const leitura = gitSomenteLeitura(sub, args);
    if (ctx.escopo === 'leitura' && GIT_ESCRITA.test(sub) && !leitura) return false;
    if (ctx.escopo === 'projeto' && !leitura && gitDestrutivoNoRoot(sub, args)) return false;
    return true;
  },
  // Na worktree/scratch `rm` é livre (área descartável). No root, só o que a
  // rule `Bash(rm -rf *.worktrees/*)` já permitia. Na leitura, nunca.
  rm(args, ctx) {
    if (ctx.escopo === 'leitura') return false;
    const alvos = pathArgs(args).map((a) => resolve(ctx.base, a));
    if (!alvos.length || alvos.some((a) => !a)) return false;
    if (ctx.escopo === 'worktree' || ctx.escopo === 'scratch') {
      return alvos.every((a) => dentroDeAlguma(ctx.escrita, a));
    }
    // No root, o que decide é o ALVO ser descartável — worktree ou scratch —
    // não o cwd. Apagar `/tmp/lixo` de dentro do projeto é tão inócuo quanto
    // apagar de dentro do próprio /tmp.
    return alvos.every((a) => ehAlvoDeWorktree(a) || dentroDeAlguma(SCRATCH, a));
  },
  // Junction de worktree + listagem. Subcomando costuma vir entre aspas:
  // `cmd //c "mklink /J a b"`.
  cmd(args, ctx) {
    const resto = args.filter((a) => !/^\/\/?[a-z]$/i.test(a));
    const blob = resto.join(' ').replace(/\\+"/g, '"').replace(/^["']|["']$/g, '').trim();
    const sub = blob.split(/\s+/)[0].toLowerCase();
    if (sub === 'dir') return true;
    if (!/^(mklink|rmdir|rd)$/.test(sub)) return false; // `rd` é alias de rmdir
    if (ctx.escopo === 'worktree') return true;
    // Do root, só mexer em junction DE worktree (espelha `rm -rf *.worktrees/*`).
    // Tokeniza respeitando aspas e descarta os switches do cmd (`/J`, `/s`,
    // `/q`) — que, de quebra, parecem path POSIX. Extrair por regex de path
    // absoluto deixava de fora o alvo RELATIVO (`.worktrees\velha`).
    const paths = tokenize(blob).slice(1)
      .filter((p) => !/^\/[a-z]$/i.test(p))
      .map((p) => resolve(ctx.base, p.replace(/^["']|["']$/g, '')))
      .filter(Boolean);
    return paths.length > 0 && paths.some(ehAlvoDeWorktree)
      && paths.every((p) => dentroDe(PROJETO, p));
  },
  // `sed -i` reescreve o arquivo no lugar — é escrita, não leitura.
  sed(args, ctx) {
    if (!args.some((a) => /^-[a-z]*i/.test(a))) return true;
    const alvos = pathArgs(args).slice(1).map((a) => resolve(ctx.base, a));
    return alvos.length > 0 && alvos.every((a) => dentroDeAlguma(ctx.escrita, a));
  },
};

/** Destino de `cp`/`mv`/`mkdir`/`touch`/`tee` tem que cair em área de escrita. */
export function destinosDeEscritaOk(head, args, ctx) {
  const alvos = pathArgs(args);
  if (!alvos.length) return false;
  // cp/mv: só o ÚLTIMO argumento é destino; os demais são origem (leitura).
  const destinos = (head === 'cp' || head === 'mv') ? alvos.slice(-1) : alvos;
  return destinos.every((a) => dentroDeAlguma(ctx.escrita, resolve(ctx.base, a)));
}

/**
 * Alvos de redirect (`>`, `>>`, `2>`). `/dev/null` e `2>&1` são inertes.
 * Vale pros dois shells — PowerShell usa a mesma sintaxe de redirect.
 */
export function redirecionamentosOk(seg, ctx) {
  const limpo = seg.replace(/"(?:[^"\\]|\\.)*"/g, ' ').replace(/'(?:[^'\\]|\\.)*'/g, ' ');
  const alvos = limpo.match(/\d?>>?\s*[^\s|;&)]+/g) || [];
  for (const bruto of alvos) {
    const alvo = bruto.replace(/^\d?>>?\s*/, '');
    if (/^&\d$/.test(alvo) || /^\/dev\/(null|stdout|stderr)$/.test(alvo)) continue;
    if (!dentroDeAlguma(ctx.escrita, resolve(ctx.base, alvo))) return false;
  }
  return true;
}

// ── áreas ────────────────────────────────────────────────────────────────────

/**
 * Descobre em que área `base` cai, e o que é permitido lá. Devolve null quando
 * o local não é conhecido — e aí o hook não aprova (falha pro lado seguro).
 */
export function contexto(base) {
  if (!base) return null;
  const ctx = (escopo, whitelist, escrita) => ({
    escopo, whitelist, escrita, base, areas: [PROJETO, ...SCRATCH, ...LEITURA],
  });
  if (dentroDe(`${PROJETO}/.worktrees`, base)) return ctx('worktree', HEADS_PROJETO, [PROJETO, ...SCRATCH]);
  if (dentroDe(PROJETO, base)) return ctx('projeto', HEADS_PROJETO, [PROJETO, ...SCRATCH]);
  if (dentroDeAlguma(SCRATCH, base)) return ctx('scratch', HEADS_PROJETO, [...SCRATCH]);
  if (dentroDeAlguma(LEITURA, base)) return ctx('leitura', HEADS_LEITURA, [...SCRATCH]);
  return null;
}
