#!/usr/bin/env node
/**
 * worktree.mjs — criar e fechar worktrees com as pegadinhas já resolvidas.
 *
 *   node scripts/worktree.mjs new <nome> [--base <branch>] [--plano <path>] [--dry-run]
 *   node scripts/worktree.mjs close <nome> [--keep-branch] [--force] [--dry-run]
 *   node scripts/worktree.mjs list
 *
 * POR QUE ESTE SCRIPT EXISTE
 *
 * Criar worktree é `git worktree add` — o resto é que custa: colisão de branch
 * entre sessões paralelas, arquivo untracked que não atravessa (o `.env` e o
 * PLANO, principalmente), deps, e um cleanup que no Windows pode **apagar o
 * node_modules do checkout principal** se a ordem estiver errada. Cada uma
 * dessas já mordeu de verdade. O script é a forma canônica dessas etapas.
 *
 * ⚠️ A REGRA QUE MAIS IMPORTA (§9 de patterns/worktree.md): junction PRIMEIRO,
 * worktree depois. No Windows, delete recursivo **segue o reparse point** e
 * apaga o conteúdo do alvo — ou seja, o `node_modules` da main. O `close` aqui
 * remove todo junction com `rmdir` (que remove só o link) antes de encostar em
 * `git worktree remove`, e NUNCA usa delete recursivo.
 *
 * EXTENSÃO POR PROJETO — `worktree.config.mjs` no root (opcional):
 *
 *   export default {
 *     base: 'main',                    // branch base do `git worktree add`
 *     branchPrefix: 'feature/',
 *     copiar: ['.env'],                // untracked que precisa atravessar
 *     deps: 'pnpm',                    // 'pnpm' | 'npm' | 'none' | async fn(ctx)
 *     async posCriar(ctx) {},          // roda depois do install
 *     async preFechar(ctx) {},         // roda antes de remover
 *   }
 *
 * `ctx` = { raiz, worktree, nome, branch, run(cmd), log(msg), dryRun }
 *
 * Em --dry-run os hooks do projeto NÃO rodam: a worktree ainda não existe e
 * qualquer instalador quebraria. Dry-run mostra o plano, não exercita.
 *
 * Projeto com estratégia de deps própria (monorepo com junction seletivo, por
 * exemplo) passa `deps` como função e chama o próprio script de lá.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// ── CLI ──────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const comando = argv[0];
const nome = argv.find((a, i) => i > 0 && !a.startsWith('--'));
const flag = (f) => argv.includes(f);
const valor = (f, padrao) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : padrao);

const dryRun = flag('--dry-run');
const prefixo = dryRun ? '[dry-run] ' : '';

const log = (m) => console.log(m);
const erro = (m) => { console.error(`\n✖ ${m}\n`); process.exit(1); };

function run(cmd, opts = {}) {
  log(`  ${prefixo}$ ${cmd}`);
  if (dryRun) return '';
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: opts.silencioso ? 'pipe' : 'inherit', ...opts });
  } catch (e) {
    if (opts.tolerante) { log(`    (falhou, seguindo: ${String(e.message).split('\n')[0]})`); return ''; }
    erro(`comando falhou: ${cmd}\n  ${String(e.message).split('\n')[0]}`);
  }
}

function capture(cmd, cwd) {
  try { return execSync(cmd, { encoding: 'utf8', cwd, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}

const norm = (p) => path.resolve(p).replace(/\\/g, '/');

// ── contexto do repo ─────────────────────────────────────────────────────────

const raiz = norm(capture('git rev-parse --show-toplevel') || process.cwd());
if (!raiz) erro('não estamos num repositório git.');

/** O root da lista é sempre o checkout principal — não rodar a partir de worktree. */
function checkoutPrincipal() {
  const lista = capture('git worktree list --porcelain');
  const linha = lista.split('\n').find((l) => l.startsWith('worktree '));
  return linha ? norm(linha.slice('worktree '.length).trim()) : raiz;
}

const principal = checkoutPrincipal();
if (raiz.toLowerCase() !== principal.toLowerCase()) {
  erro(`rode a partir do checkout principal (${principal}), não de dentro de uma worktree.`);
}

async function carregaConfig() {
  const p = path.join(raiz, 'worktree.config.mjs');
  if (!fs.existsSync(p)) return {};
  try { return (await import(pathToFileURL(p).href)).default ?? {}; }
  catch (e) { erro(`worktree.config.mjs não carregou: ${e.message}`); }
}

// ── subcomandos ──────────────────────────────────────────────────────────────

async function novo(cfg) {
  if (!nome) erro('uso: worktree.mjs new <nome> [--base <branch>] [--plano <path>]');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(nome)) erro(`nome inválido: "${nome}" — use kebab-case.`);

  const base = valor('--base', cfg.base || 'main');
  const branch = `${cfg.branchPrefix ?? 'feature/'}${nome}`;
  const destino = path.join(raiz, '.worktrees', nome);

  log(`\n▸ criando worktree "${nome}"${dryRun ? ' [DRY RUN]' : ''}`);
  log(`  branch: ${branch}   base: ${base}`);
  log(`  destino: ${destino}\n`);

  // ── colisões: sessões paralelas reusam nome e se atropelam ────────────────
  if (fs.existsSync(destino)) erro(`já existe: ${destino}`);
  if (capture(`git rev-parse --verify --quiet ${branch}`)) {
    erro(`a branch "${branch}" já existe. Outra sessão pode estar nela — escolha outro nome ou finalize aquela primeiro.`);
  }
  const emUso = capture('git worktree list --porcelain')
    .split('\n\n').find((b) => b.includes(`branch refs/heads/${branch}`));
  if (emUso) erro(`a branch "${branch}" já está checada em outra worktree.`);
  if (!capture(`git rev-parse --verify --quiet ${base}`)) erro(`branch base não existe: ${base}`);

  // ── .gitignore ────────────────────────────────────────────────────────────
  const gi = path.join(raiz, '.gitignore');
  const cobre = fs.existsSync(gi) && /^\.worktrees\/?$/m.test(fs.readFileSync(gi, 'utf8'));
  if (!cobre) log('  ⚠ .gitignore não cobre `.worktrees/` — acrescente antes de commitar.\n');

  run(`git worktree add "${destino}" -b ${branch} ${base}`);

  // ── untracked que precisa atravessar ──────────────────────────────────────
  // `git worktree add` parte do COMMIT: nada não-commitado vai junto. O `.env`
  // e o arquivo de plano são os que sempre faltam — sem o plano, o implementer
  // despachado lá dentro improvisa.
  const copiar = [...(cfg.copiar ?? ['.env']), valor('--plano', null)].filter(Boolean);
  if (copiar.length) {
    log('\n  arquivos untracked levados junto:');
    for (const rel of copiar) {
      const de = path.isAbsolute(rel) ? rel : path.join(raiz, rel);
      if (!fs.existsSync(de)) { log(`    – ${rel} (não existe, pulando)`); continue; }
      const para = path.join(destino, path.relative(raiz, de));
      log(`    ✓ ${prefixo}${rel}`);
      if (!dryRun) {
        fs.mkdirSync(path.dirname(para), { recursive: true });
        fs.copyFileSync(de, para);
      }
    }
  }

  // ── deps ──────────────────────────────────────────────────────────────────
  const ctx = { raiz, worktree: destino, nome, branch, run, log, dryRun };
  log('\n  dependências:');
  if (dryRun) {
    // Em dry-run a worktree não existe, então qualquer instalador (ou script
    // de junction do projeto) quebraria ao encontrar o diretório ausente.
    // Dry-run mostra o plano; não exercita sub-script.
    log(`    (dry-run: ${typeof cfg.deps === 'function' ? 'cfg.deps() do projeto' : (cfg.deps || 'install padrão')} rodaria aqui)`);
  } else if (typeof cfg.deps === 'function') {
    await cfg.deps(ctx);
  } else if (cfg.deps === 'none') {
    log('    (config: none — pulando)');
  } else {
    // Default: install REAL na worktree. Junction com pnpm é perigoso — o
    // verify-deps-before-run tenta purgar o modules dir (worktree.md §5.2).
    const pm = cfg.deps || (fs.existsSync(path.join(raiz, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm');
    run(`${pm} install`, { cwd: dryRun ? undefined : destino });
  }

  if (cfg.posCriar) { log('\n  posCriar (config do projeto):'); await cfg.posCriar(ctx); }

  log(`\n✔ worktree pronta: ${destino}`);
  log(`  próximo: trabalhe a partir de lá — NÃO prefixe \`cd\` nos comandos,`);
  log(`  o cwd persiste (ver patterns/command-forms.md).\n`);
}

async function fechar(cfg) {
  if (!nome) erro('uso: worktree.mjs close <nome> [--keep-branch] [--force]');
  const destino = path.join(raiz, '.worktrees', nome);
  // A branch vem da PRÓPRIA worktree, não da convenção de nome. Deduzir
  // `feature/<nome>` faz o `git log base..branch` apontar pra uma ref que não
  // existe, e a checagem de commits não-mergeados **passa em silêncio** — que
  // é a pior falha possível num comando destrutivo. (Caso real: worktree
  // `operacoes-assincronas` estava em `feat/operacoes-assincronas-fase-3`.)
  const branch = capture('git rev-parse --abbrev-ref HEAD', destino)
    || `${cfg.branchPrefix ?? 'feature/'}${nome}`;

  if (!fs.existsSync(destino)) {
    log(`\n  worktree não existe em ${destino} — só limpando referências.`);
    run('git worktree prune');
    return;
  }

  log(`\n▸ fechando worktree "${nome}"${dryRun ? ' [DRY RUN]' : ''}\n`);

  // ── trabalho não salvo ────────────────────────────────────────────────────
  const sujo = capture('git status --porcelain', destino);
  if (sujo && !flag('--force')) {
    log(sujo.split('\n').slice(0, 10).map((l) => `    ${l}`).join('\n'));
    erro('a worktree tem mudanças não commitadas (acima). Commite, ou use --force para descartar.');
  }
  const base = cfg.base || 'main';
  log(`  branch da worktree: ${branch}`);
  // Guarda que não consegue rodar precisa GRITAR, não passar batido.
  if (!capture(`git rev-parse --verify --quiet ${base}`) || !capture(`git rev-parse --verify --quiet ${branch}`, destino)) {
    if (!flag('--force')) erro(`não consegui comparar "${branch}" com "${base}" (uma das refs não resolve) — a checagem de commits não-mergeados NÃO rodou. Confira à mão e use --force se estiver certo de que pode fechar.`);
    log('  ⚠ checagem de merge pulada (refs não resolvem) — seguindo por --force.');
  } else {
    const naoMergeado = capture(`git log --oneline ${base}..${branch}`, destino);
    if (naoMergeado && !flag('--force')) {
      log(naoMergeado.split('\n').slice(0, 10).map((l) => `    ${l}`).join('\n'));
      erro(`a branch tem ${naoMergeado.split('\n').length} commit(s) fora de ${base} (acima). Faça o merge, ou use --force.`);
    }
  }

  const ctx = { raiz, worktree: destino, nome, branch, run, log, dryRun };
  if (cfg.preFechar && !dryRun) { log('  preFechar (config do projeto):'); await cfg.preFechar(ctx); }
  else if (cfg.preFechar) log('  preFechar (config do projeto): (dry-run: pulado)');

  // ── 🛑 junctions ANTES de qualquer remoção ────────────────────────────────
  // No Windows o delete recursivo segue o reparse point e apaga o ALVO — o
  // node_modules do checkout principal. `rmdir` remove só o link.
  log('\n  removendo junctions/symlinks (antes de tocar na worktree):');
  const links = achaLinks(destino);
  const MOSTRAR = 12; // junction seletivo gera centenas — não despejar tudo
  let n = 0;
  for (const p of links) {
    if (n < MOSTRAR) log(`    ${prefixo}rmdir ${path.relative(destino, p)}`);
    else if (n === MOSTRAR) log(`    … (+${links.length - MOSTRAR} outros)`);
    if (!dryRun) {
      try { fs.rmdirSync(p); } catch { try { fs.unlinkSync(p); } catch (e) { erro(`não consegui remover o link ${p}: ${e.message}. Remova à mão ANTES de seguir — delete recursivo aqui apaga o alvo.`); } }
    }
    n++;
  }
  log(n ? `    (${n} removidos)` : '    (nenhum)');

  // ── remoção ───────────────────────────────────────────────────────────────
  log('');
  run(`git worktree remove "${destino}"${flag('--force') ? ' --force' : ''}`);
  run('git worktree prune');
  if (!flag('--keep-branch')) {
    // `-d` só apaga branch já mergeada — nunca `-D` aqui.
    run(`git branch -d ${branch}`, { silencioso: true, stdio: 'inherit' });
  }

  log(`\n✔ worktree "${nome}" fechada.\n`);
}

/**
 * Junctions/symlinks dentro da worktree, das folhas para a raiz. Usa lstat
 * (não segue o link) e NÃO desce dentro de link — descer seguiria pro alvo.
 */
function achaLinks(dir, out = []) {
  let entradas;
  try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entradas) {
    const p = path.join(dir, e.name);
    let st;
    try { st = fs.lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink()) { out.push(p); continue; } // não desce
    if (st.isDirectory()) achaLinks(p, out);
  }
  return out;
}

function listar() {
  log('');
  log(capture('git worktree list') || '(nenhuma)');
  log('');
}

// ── dispatch ─────────────────────────────────────────────────────────────────

const cfg = await carregaConfig();
if (comando === 'new') await novo(cfg);
else if (comando === 'close') await fechar(cfg);
else if (comando === 'list') listar();
else {
  log(`
worktree.mjs — criar e fechar worktrees

  new <nome>    [--base <branch>] [--plano <path>] [--dry-run]
  close <nome>  [--keep-branch] [--force] [--dry-run]
  list

Extensão por projeto: worktree.config.mjs no root (ver cabeçalho do script).
`);
  process.exit(comando ? 1 : 0);
}
