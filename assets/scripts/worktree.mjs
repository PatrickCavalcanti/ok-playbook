#!/usr/bin/env node
/**
 * worktree.mjs — criar e fechar worktrees com as pegadinhas já resolvidas.
 *
 *   node scripts/worktree.mjs new <nome> [--plano <path>] [--commit-abertura] [--base <branch>] [--dry-run]
 *   node scripts/worktree.mjs close <nome> [--keep-branch] [--force] [--dry-run]
 *   node scripts/worktree.mjs list
 *
 * CONTRATO
 *
 * A última linha da saída é sempre um SINAL, e o exit code acompanha:
 *
 *   OK <path-da-worktree>      exit 0   pronta, deps validadas
 *   SUJO: <n> arquivo(s)       exit 2   a main tem mudança não commitada; NADA
 *                                       foi tocado e a worktree NÃO foi criada.
 *                                       O agente pergunta ao usuário:
 *                                         "commita tudo"    → re-rodar com --commit-abertura
 *                                         "commita separado"→ agente commita e re-roda
 *   FALTA: <o quê>             exit 1   pré-requisito ausente, nomeado
 *
 * Main suja é COMMIT PENDENTE, não estado a preservar: se está na main, é
 * estável. Preservar é commitar — este script nunca faz reset/stash/checkout --.
 * `--commit-abertura` faz UM commit padrão ("chore(main): abertura de worktree —
 * snapshot") com a lista de arquivos no corpo, e segue. A worktree só nasce com
 * a main limpa, então o plano vai junto por consequência (`--plano` só VALIDA
 * que ele está tracked).
 *
 * POR QUE ESTE SCRIPT EXISTE
 *
 * Criar worktree é `git worktree add` — o resto é que custa: main suja que a
 * worktree não herda, colisão de branch entre sessões paralelas, `.env` que não
 * atravessa, deps, submódulo vazio, e um cleanup que no Windows pode **apagar o
 * node_modules do checkout principal** se a ordem estiver errada.
 *
 * ⚠️ A REGRA QUE MAIS IMPORTA: junction PRIMEIRO, worktree depois. No Windows,
 * delete recursivo **segue o reparse point** e apaga o conteúdo do alvo. O
 * `close` aqui remove todo junction/symlink com `rmdir` (que remove só o link)
 * antes de encostar em `git worktree remove`. Delete recursivo continua proibido
 * como FERRAMENTA GENÉRICA (nada de `fs.rmSync(recursive)`, `rd /s`, `rm -rf`).
 * A única exceção é o removedor próprio de `close` (`removeArvoreSemSeguirLink`),
 * que só roda na sobra da pasta DEPOIS das guardas e da remoção dos links, e é
 * seguro porque nunca segue link: percorre com lstat, link → rmdir/unlink do
 * link sem entrar, arquivo → unlink, diretório → recursão + rmdir. Usa o prefixo
 * `\\?\` no Windows, para caminho > 260 caracteres (`node_modules/.pnpm/...`).
 *
 * DEPS — instalação real na worktree, escolhida pelo lockfile na raiz:
 *   pnpm-lock.yaml    → pnpm install
 *   package-lock.json → npm ci
 *   yarn.lock         → yarn install --frozen-lockfile
 *   nenhum            → pula, com aviso (não é falha)
 * Não usar junction de node_modules com pnpm: o verify-deps tenta purgar o
 * modules dir, com risco de atingir o checkout principal.
 *
 * EXTENSÃO POR PROJETO — `worktree.config.mjs` no root (OPCIONAL; ausente =
 * defaults abaixo). Chaves aceitas:
 *
 *   export default {
 *     base: 'main',                    // branch base do `git worktree add` (default 'main')
 *     branchPrefix: 'feature/',        // prefixo da branch (default 'feature/')
 *     copiar: ['.env'],                // untracked que precisa atravessar (default ['.env'])
 *     deps: 'pnpm',                    // 'pnpm' | 'npm' | 'yarn' | 'none' | async fn(ctx)
 *                                      //   (ausente = detectar pelo lockfile)
 *     async posCriar(ctx) {},          // roda depois do install
 *     async preFechar(ctx) {},         // roda antes de remover
 *     async posFechar(ctx) {},         // roda depois de remover (só reporta)
 *   }
 *
 * `ctx` = { raiz, worktree, nome, branch, run(cmd), log(msg), dryRun }
 *
 * Em --dry-run os hooks do projeto NÃO rodam: a worktree ainda não existe e
 * qualquer instalador quebraria. Dry-run mostra o plano, não exercita.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// ── CLI ──────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const comando = argv[0];
const nome = argv.find((a, i) => i > 0 && !a.startsWith('--') && argv[i - 1] !== '--plano' && argv[i - 1] !== '--base');
const flag = (f) => argv.includes(f);
const valor = (f, padrao) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : padrao);

const dryRun = flag('--dry-run');
const prefixo = dryRun ? '[dry-run] ' : '';

const log = (m) => console.log(m);
// Sinais do contrato — sempre a ÚLTIMA linha, exit code acompanha.
const falta = (m) => { console.log(`\nFALTA: ${m}`); process.exit(1); };
const sujo = (m) => { console.log(`\nSUJO: ${m}`); process.exit(2); };
const ok = (m) => { console.log(`\nOK ${m}`); process.exit(0); };
const erro = falta; // erro operacional é FALTA para quem consome o sinal

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
  // trimEnd (não trim): o espaço inicial da 1ª linha do `status --porcelain` é significativo.
  try { return execSync(cmd, { encoding: 'utf8', cwd, stdio: ['ignore', 'pipe', 'ignore'] }).trimEnd(); }
  catch { return ''; }
}

const norm = (p) => path.resolve(p).replace(/\\/g, '/');

// ── contexto do repo ─────────────────────────────────────────────────────────

const raiz = norm(capture('git rev-parse --show-toplevel') || process.cwd());
if (!capture('git rev-parse --show-toplevel')) erro('não estamos num repositório git.');

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

/**
 * Estado da main: linhas do `git status --porcelain` (vazio = limpa).
 * `.worktrees/` não conta: são as próprias worktrees (o .gitignore deve cobri-lo).
 */
function estadoDaMain() {
  const s = capture('git status --porcelain --untracked-files=all', raiz);
  return s ? s.split('\n').filter((l) => l && !l.slice(3).startsWith('.worktrees/')) : [];
}

/**
 * Commit de abertura: UM commit, mensagem padrão, lista no corpo. `add -A` +
 * `commit` na mesma chamada porque sessões paralelas compartilham o índice.
 */
function commitDeAbertura(linhas) {
  const corpo = linhas.map((l) => `- ${l.slice(3)}`).join('\n');
  const msg = `chore(main): abertura de worktree — snapshot\n\nArquivos não commitados na main no momento de abrir a worktree "${nome}":\n\n${corpo}\n`;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-msg-'));
  const tmp = path.join(tmpDir, 'msg.txt');
  try {
    fs.writeFileSync(tmp, msg);
    run(`git add -A && git commit -q -F "${tmp}"`, { cwd: raiz });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  return capture('git rev-parse --short HEAD', raiz);
}

/** Nome livre: nem diretório nem branch existem. Colisão → sufixo -2, -3… */
function nomeLivre(base, prefixoBranch) {
  const emUso = capture('git worktree list --porcelain');
  for (let i = 1; i < 50; i++) {
    const n = i === 1 ? base : `${base}-${i}`;
    const branch = `${prefixoBranch}${n}`;
    const dir = path.join(raiz, '.worktrees', n);
    const branchExiste = !!capture(`git rev-parse --verify --quiet ${branch}`);
    const checada = emUso.includes(`branch refs/heads/${branch}`);
    if (!fs.existsSync(dir) && !branchExiste && !checada) return { n, branch, dir, sufixado: i > 1 };
  }
  falta(`não achei nome livre para "${base}" (tentei até -49).`);
}

/** Comando de instalação a partir da config ou do lockfile; null = nada a instalar. */
function comandoDeDeps(cfgDeps) {
  const tem = (f) => fs.existsSync(path.join(raiz, f));
  const porGerenciador = {
    pnpm: 'pnpm install',
    npm: tem('package-lock.json') ? 'npm ci' : 'npm install',
    yarn: 'yarn install --frozen-lockfile',
  };
  if (cfgDeps && porGerenciador[cfgDeps]) return porGerenciador[cfgDeps];
  if (tem('pnpm-lock.yaml')) return porGerenciador.pnpm;
  if (tem('package-lock.json')) return porGerenciador.npm;
  if (tem('yarn.lock')) return porGerenciador.yarn;
  return null;
}

async function novo(cfg) {
  if (!nome) falta('uso: worktree.mjs new <nome> [--plano <path>] [--commit-abertura] [--base <branch>]');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(nome)) falta(`nome inválido: "${nome}" — use kebab-case.`);

  const base = valor('--base', cfg.base || 'main');
  if (!/^[A-Za-z0-9._\/-]+$/.test(base)) falta(`--base inválido: "${base}" — use só letras, dígitos, . _ / -`);
  if (!capture(`git rev-parse --verify --quiet ${base}`)) falta(`branch base não existe: ${base}`);

  log(`\n▸ worktree "${nome}"${dryRun ? ' [DRY RUN]' : ''}   base: ${base}`);

  // ── 1. estado da main ─────────────────────────────────────────────────────
  // Main suja é commit pendente. Sem --commit-abertura: SUJO e nada é tocado.
  let linhas = estadoDaMain();
  if (linhas.length) {
    log(`\n  main com ${linhas.length} mudança(s) não commitada(s):`);
    for (const l of linhas.slice(0, 40)) log(`    ${l}`);
    if (linhas.length > 40) log(`    … (+${linhas.length - 40})`);
    if (!flag('--commit-abertura')) {
      log('\n  nada foi tocado. Decisão do usuário:');
      log('    "commita tudo"     → re-rodar com --commit-abertura');
      log('    "commita separado" → commitar agrupado e re-rodar');
      sujo(`${linhas.length} arquivo(s) não commitado(s) na main — worktree NÃO criada`);
    }
    if (dryRun) log('\n  [dry-run] commit de abertura rodaria aqui');
    else {
      const sha = commitDeAbertura(linhas);
      log(`\n  ✓ commit de abertura ${sha} levou ${linhas.length} arquivo(s)`);
      linhas = estadoDaMain();
      if (linhas.length) falta(`main ainda suja depois do commit de abertura (${linhas.length}) — confira à mão.`);
    }
  } else {
    log('  ✓ main limpa');
  }

  // ── 2. plano: só valida (a worktree nasce da main limpa, então ele vai) ───
  const plano = valor('--plano', null);
  if (plano) {
    const abs = path.isAbsolute(plano) ? plano : path.join(raiz, plano);
    if (!fs.existsSync(abs)) falta(`plano não existe: ${plano}`);
    const rel = path.relative(raiz, abs).replace(/\\/g, '/');
    if (!capture(`git ls-files --error-unmatch -- "${rel}"`, raiz)) falta(`plano não está tracked no git: ${rel} — commite antes.`);
    log(`  ✓ plano tracked: ${rel}`);
  }

  // ── 3. nome/branch únicos ─────────────────────────────────────────────────
  const { n, branch, dir: destino, sufixado } = nomeLivre(nome, cfg.branchPrefix ?? 'feature/');
  if (sufixado) log(`  ⚠ "${nome}" já em uso (sessão paralela?) — usando "${n}"`);
  log(`  branch: ${branch}\n  destino: ${destino}`);

  const gi = path.join(raiz, '.gitignore');
  const cobre = fs.existsSync(gi) && /^\/?\.worktrees\/?$/m.test(fs.readFileSync(gi, 'utf8'));
  if (!cobre) log('  ⚠ .gitignore não cobre `.worktrees/` — acrescente antes de commitar.');

  // ── 4. criação ────────────────────────────────────────────────────────────
  log('');
  run(`git worktree add "${destino}" -b ${branch} ${base}`);

  // `.env` é untracked por desenho e não atravessa; o plano não precisa mais.
  for (const rel of cfg.copiar ?? ['.env']) {
    const de = path.join(raiz, rel);
    if (!fs.existsSync(de)) { log(`  – ${rel} (não existe, pulando)`); continue; }
    if (!dryRun) { fs.mkdirSync(path.dirname(path.join(destino, rel)), { recursive: true }); fs.copyFileSync(de, path.join(destino, rel)); }
    log(`  ✓ ${prefixo}${rel} copiado`);
  }

  // ── 5. deps + submódulos ──────────────────────────────────────────────────
  const ctx = { raiz, worktree: destino, nome: n, branch, run, log, dryRun };
  let instalou = false;
  log('\n  dependências:');
  if (typeof cfg.deps === 'function') {
    if (dryRun) log('    (dry-run: cfg.deps() do projeto rodaria aqui)');
    else { await cfg.deps(ctx); instalou = true; }
  } else if (cfg.deps === 'none') {
    log('    (config: none — pulando)');
  } else {
    const cmd = comandoDeDeps(cfg.deps);
    if (!cmd) log('    ⚠ nenhum lockfile na raiz (pnpm-lock.yaml, package-lock.json, yarn.lock) — instalação pulada.');
    else { run(cmd, { cwd: destino }); instalou = !dryRun; }
  }
  // `git worktree add` não inicializa submódulo — vêm vazios.
  if (!dryRun && fs.existsSync(path.join(raiz, '.gitmodules'))) {
    log('\n  submódulos:');
    run('git submodule update --init --recursive', { cwd: destino, tolerante: true, silencioso: true });
  }
  if (cfg.posCriar) { log('\n  posCriar (config do projeto):'); if (!dryRun) await cfg.posCriar(ctx); else log('    (dry-run: pulado)'); }

  // ── 6. validação (auto-validação é o contrato) ────────────────────────────
  if (!dryRun) {
    const faltas = [];
    if (instalou && typeof cfg.deps !== 'function' && fs.existsSync(path.join(raiz, 'package.json'))
      && !fs.existsSync(path.join(destino, 'node_modules'))) faltas.push('node_modules ausente na worktree');
    if (fs.existsSync(path.join(raiz, '.gitmodules'))) {
      const status = capture('git submodule status --recursive', destino);
      if (status.split('\n').some((l) => l.startsWith('-'))) faltas.push('submódulo não inicializado');
    }
    if (faltas.length) falta(`worktree criada em ${destino}, mas: ${faltas.join('; ')}`);
  }

  log(`\n  próximo: trabalhe a partir de lá — NÃO prefixe \`cd\` nos comandos, o cwd persiste.`);
  ok(dryRun ? `[dry-run] ${destino}` : destino);
}

async function fechar(cfg) {
  if (!nome) erro('uso: worktree.mjs close <nome> [--keep-branch] [--force]');
  const destino = path.join(raiz, '.worktrees', nome);
  // A branch vem da PRÓPRIA worktree, não da convenção de nome. Deduzir
  // `feature/<nome>` faz o `git log base..branch` apontar pra uma ref que não
  // existe, e a checagem de commits não-mergeados **passa em silêncio** — que
  // é a pior falha possível num comando destrutivo.
  const branch = capture('git rev-parse --abbrev-ref HEAD', destino)
    || `${cfg.branchPrefix ?? 'feature/'}${nome}`;

  if (!fs.existsSync(destino)) {
    log(`\n  worktree não existe em ${destino} — só limpando referências.`);
    run('git worktree prune');
    if (cfg.posFechar && !dryRun) { log('\n  posFechar (config do projeto):'); await cfg.posFechar({ raiz, worktree: destino, nome, branch, run, log, dryRun }); }
    const ramo = `${cfg.branchPrefix ?? 'feature/'}${nome}`;
    const ramoExiste = !!capture(`git rev-parse --verify --quiet ${ramo}`, raiz);
    ok(`worktree "${nome}" não existia — referências limpas${ramoExiste ? `; branch ${ramo} não foi tocada` : ''}`);
  }

  log(`\n▸ fechando worktree "${nome}"${dryRun ? ' [DRY RUN]' : ''}\n`);

  // ── trabalho não salvo ────────────────────────────────────────────────────
  const naoSalvo = capture('git status --porcelain', destino);
  if (naoSalvo && !flag('--force')) {
    log(naoSalvo.split('\n').slice(0, 10).map((l) => `    ${l}`).join('\n'));
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
  const MOSTRAR = 12;
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

  // ── submódulos ANTES da remoção ───────────────────────────────────────────
  // `git worktree remove` recusa worktree com submódulo e pela doc só sai com
  // --force. deinit (limpa o conteúdo) + remove --force é seguro porque as
  // guardas de trabalho não salvo e commits não mergeados já rodaram ACIMA.
  const temSubmodulo = fs.existsSync(path.join(destino, '.gitmodules'));
  if (temSubmodulo) {
    log('\n  desinicializando submódulos:');
    run('git submodule deinit -f --all', { cwd: destino, tolerante: true, silencioso: true });
  }

  // ── remoção ───────────────────────────────────────────────────────────────
  // Tolerante: no Windows o remove pode apagar conteúdo + registro e falhar
  // só ao apagar a PASTA (processo com ela como cwd). Abortar aqui deixa estado
  // meio-removido — pior que terminar o serviço.
  log('');
  if (norm(process.cwd()).toLowerCase().startsWith(norm(destino).toLowerCase())) process.chdir(raiz);
  run(`git worktree remove "${destino}"${(flag('--force') || temSubmodulo) ? ' --force' : ''}`, { tolerante: true });
  run('git worktree prune');
  // Sobra comum no Windows: o `git worktree remove` não apaga arquivo de
  // `node_modules/.pnpm/...` com caminho > 260 caracteres e deixa a pasta. Aqui as
  // guardas e a remoção dos links já passaram; o removedor próprio termina o
  // serviço sem nunca descer em link. Preso por processo → fica em `travados`.
  let travados = [];
  if (fs.existsSync(destino)) {
    log('\n  pasta sobrou após o `git worktree remove` — removedor próprio (não desce em link):');
    const r = removeArvoreSemSeguirLink(destino, { dryRun, dirRaiz: path.join(raiz, '.worktrees') });
    if (dryRun) {
      log(`    [dry-run] removeria ${r.arquivos} arquivo(s), ${r.links} link(s), ${r.pastas} pasta(s) — nada foi apagado`);
      for (const l of r.amostra) log(`    [dry-run]   ${l}`);
    } else {
      log(`    ✓ ${r.arquivos} arquivo(s), ${r.links} link(s), ${r.pastas} pasta(s) removidos`);
      travados = r.travados;
    }
  }
  if (!flag('--keep-branch')) {
    // `-d` só apaga branch já mergeada — nunca `-D` aqui.
    run(`git branch -d ${branch}`, { silencioso: true, stdio: 'inherit', tolerante: true });
  }

  if (cfg.posFechar && !dryRun) { log('\n  posFechar (config do projeto):'); await cfg.posFechar(ctx); }
  else if (cfg.posFechar) log('\n  posFechar (config do projeto): (dry-run: pulado)');

  if (!dryRun && fs.existsSync(destino)) {
    const preso = travados.length
      ? `; travou: ${travados[0]}${travados.length > 1 ? ` (+${travados.length - 1} outro(s))` : ''}`
      : '';
    falta(`worktree desregistrada, mas a pasta ${destino} ainda existe${preso} (processo com ela aberta como cwd ou arquivo em uso? feche-o e apague à mão).`);
  }
  ok(`worktree "${nome}" fechada`);
}

/**
 * Caminho absoluto aceito pelo Windows acima de 260 caracteres: prefixo `\\?\`.
 * Só no Windows; em outros SOs devolve o caminho como está. Não fiamos no
 * `LongPathsEnabled` do registro (varia por máquina).
 */
function caminhoLongo(p) {
  if (process.platform !== 'win32') return p;
  const abs = path.resolve(p);
  if (abs.startsWith('\\\\?\\')) return abs;
  if (abs.startsWith('\\\\')) return `\\\\?\\UNC\\${abs.slice(2)}`;
  return `\\\\?\\${abs}`;
}

const semPrefixo = (p) => p.replace(/^\\\\\?\\(UNC\\)?/, (_, unc) => (unc ? '\\\\' : ''));

/**
 * Remove uma árvore SEM nunca descer em link. A garantia é deste código, não de
 * comportamento implícito do Node (por isso não é `fs.rmSync(recursive)`):
 *   link (symlink ou junction — `lstat().isSymbolicLink()` é true para ambos no
 *     Windows) → rmdir/unlink do LINK, sem entrar → o alvo fica intacto;
 *   arquivo → unlink;
 *   diretório → recursão e depois rmdir.
 * Só roda para pasta dentro de `dirRaiz` (`.worktrees/`) e nunca para o próprio
 * `dirRaiz`. Em dryRun apenas conta e amostra. Devolve contagens, `amostra`
 * (dry-run) e `travados` (caminhos que não saíram, ex.: arquivo preso por processo).
 */
function removeArvoreSemSeguirLink(topo, { dryRun = false, dirRaiz } = {}) {
  const r = { arquivos: 0, links: 0, pastas: 0, amostra: [], travados: [] };
  const rel = path.relative(path.resolve(dirRaiz), path.resolve(topo));
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    r.travados.push(`${topo} (recusado: fora de ${dirRaiz})`);
    return r;
  }
  const MOSTRAR = 12;
  const nota = (verbo, p) => { if (dryRun && r.amostra.length < MOSTRAR) r.amostra.push(`${verbo} ${path.relative(topo, semPrefixo(p)) || '.'}`); };
  const trava = (p, e) => r.travados.push(`${semPrefixo(p)} (${e && e.code ? e.code : e})`);

  /** Tenta op; em EPERM (somente-leitura) limpa o atributo e tenta de novo uma vez. */
  const tenta = (op, p) => {
    try { op(); return true; }
    catch (e) {
      if (e && e.code === 'EPERM') {
        try { fs.chmodSync(p, 0o666); op(); return true; } catch (e2) { trava(p, e2); return false; }
      }
      if (e && e.code === 'ENOENT') return true; // já foi
      trava(p, e);
      return false;
    }
  };

  const apaga = (dir) => {
    let nomes;
    try { nomes = fs.readdirSync(dir); } catch (e) { trava(dir, e); return false; }
    let limpo = true;
    for (const nm of nomes) {
      const p = `${dir}${path.sep}${nm}`;
      let st;
      try { st = fs.lstatSync(p); } catch (e) { trava(p, e); limpo = false; continue; }
      if (st.isSymbolicLink()) { // NÃO desce: remove só o link
        r.links++; nota('rmdir(link)', p);
        if (!dryRun && !tenta(() => { try { fs.rmdirSync(p); } catch { fs.unlinkSync(p); } }, p)) limpo = false;
      } else if (st.isDirectory()) {
        const sub = apaga(p);
        r.pastas++; nota('rmdir', p);
        if (!sub || (!dryRun && !tenta(() => fs.rmdirSync(p), p))) limpo = false;
      } else {
        r.arquivos++; nota('unlink', p);
        if (!dryRun && !tenta(() => fs.unlinkSync(p), p)) limpo = false;
      }
    }
    return limpo;
  };

  const raizLonga = caminhoLongo(topo);
  let st;
  try { st = fs.lstatSync(raizLonga); } catch { return r; }
  if (st.isSymbolicLink()) { // o próprio destino é um link: só o link sai
    r.links++; nota('rmdir(link)', raizLonga);
    if (!dryRun) tenta(() => { try { fs.rmdirSync(raizLonga); } catch { fs.unlinkSync(raizLonga); } }, raizLonga);
    return r;
  }
  const limpo = apaga(raizLonga);
  r.pastas++; nota('rmdir', raizLonga);
  if (!dryRun && limpo) tenta(() => fs.rmdirSync(raizLonga), raizLonga);
  return r;
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
  const lista = capture('git worktree list');
  log(lista || '(nenhuma)');
  ok(`${lista ? lista.split('\n').length : 0} worktrees`);
}

// ── dispatch ─────────────────────────────────────────────────────────────────

try {
const cfg = await carregaConfig();
if (comando === 'new') await novo(cfg);
else if (comando === 'close') await fechar(cfg);
else if (comando === 'list') listar();
else {
  log(`
worktree.mjs — criar e fechar worktrees

  new <nome>    [--plano <path>] [--commit-abertura] [--base <branch>] [--dry-run]
  close <nome>  [--keep-branch] [--force] [--dry-run]
  list

Sinais (última linha): OK <path> (0) | SUJO: … (2) | FALTA: … (1)

Extensão por projeto: worktree.config.mjs no root, opcional (ver cabeçalho do script).
`);
  falta('comando — use new|close|list');
}
} catch (e) {
  falta(String(e && e.message ? e.message : e).split('\n')[0]);
}
