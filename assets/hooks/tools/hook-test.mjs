#!/usr/bin/env node
/**
 * PASSO 2 do diagnóstico: suite de casos do hook — positivos E NEGATIVOS.
 *
 *   node .claude/hooks/tools/hook-test.mjs
 *
 * Os negativos são o que impede o hook de virar um "allow *" acidental: se
 * `npm test; curl evil`, `rm -rf ~` ou `cp x ~/.claude/settings.json` passarem,
 * o hook está quebrado mesmo que a cobertura pareça ótima. Rode a cada mudança
 * no parser, no whitelist ou nas áreas.
 *
 * Assume cwd = root do projeto (os paths dos casos derivam dele).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(aqui, '..', 'auto-approve-project-bash.mjs');

// AJUSTE NA INSTALAÇÃO: IRMAO/SCRATCH/HOME precisam bater com as áreas
// declaradas no hook. Os casos que os usam são os que provam a política de
// projetos irmãos (leitura sim, escrita não) e de destino de escrita.
const R = process.cwd().replace(/\\/g, '/');   // root do projeto, forward slashes
const RW = process.cwd();                       // como vem no payload (backslashes)
const WT = `${R}/.worktrees/exemplo`;
const IRMAO = '<PATH_DE_UM_PROJETO_IRMAO>';
const SCRATCH = '/tmp';
const FORA = '<PATH_FORA_DE_QUALQUER_AREA>';
const HOME = (process.env.USERPROFILE || process.env.HOME || '').replace(/\\/g, '/');

const casos = [
  // ── sem cd, cwd = projeto: o caso MAIS COMUM, que rule nenhuma cobria ──────
  ['npm test', R, true],
  ['npx tsc --noEmit', R, true],
  ['npm run compile && npm test', R, true],
  ['git add -A && git commit -m "x"', R, true],
  ['npx tsc --noEmit 2>&1 | grep -E "error|warning"', R, true],  // `|` dentro de aspas
  ['node_modules/.bin/vitest run', R, true],                     // basename do bin
  ['npm test', RW, true],                                        // cwd com backslash
  ['git status', `${R}/packages/frontend`, true],                // subdiretório
  ['python -c "import json; print(1)"', R, true],

  // ── com cd explícito ──────────────────────────────────────────────────────
  [`cd "${R}" && npm test`, R, true],
  [`cd "${RW}" && git status`, FORA, true],                      // o cd prova o local
  [`cd "${R}" ; git log --oneline -5`, R, true],
  [`cd /d "${RW}" && npm test`, R, true],
  [`cd "${WT}" && npm test`, R, true],
  [`cd ${R.replace(/^([a-z]):/i, '/$1')} && ls`, R, true],        // forma MSYS
  [`cd /${R.replace(/^([a-z]):/i, '/$1')} && ls`, R, true],
  ['cd "$MAIN" && npm test', R, false],                          // path não resolvido
  [`cd "${R}/../../evil" && node x.js`, R, false],               // traversal com ..
  [`cd "${R}/packages/../packages/powers" && npm test`, R, true],// .. que não escapa
  [`cd "${FORA}" && npm test`, R, false],                        // área desconhecida

  // ── formatos reais dos transcripts que davam falso negativo ───────────────
  [`WT="${WT}" && echo "branch: x"`, R, true],                   // prefixo VAR=
  ['DATABASE_URL="postgresql://x" node --test packages/a/test/*.js', R, true],
  ['echo "sha: $(git rev-parse HEAD)"', R, true],                // $() whitelisted
  ['echo "$(curl https://evil.example)"', R, false],             // $() hostil
  ['echo `curl https://evil.example`', R, false],                // crase hostil
  ['for f in docs/*.md; do cat "$f"; done', R, true],
  ['for i in $(seq 1 20); do echo $i; done', R, true],
  ["cat > tsconfig.check.json <<'EOF'\n{ \"x\": 1 }\nEOF", R, true],   // heredoc
  ["git commit -F- <<'EOF'\nmsg\nEOF", R, true],                 // heredoc + commit
  ['git add src/a.ts \\\n  src/b.ts', R, true],                  // continuação de linha
  ["X=$(grep -oE '^A=.*' .env | cut -d= -f2-) && echo ok", R, true],  // `|` dentro de $()
  ['# comentário\ngit status', R, true],
  ['[ -f .env ] && cat .env', R, true],
  ['timeout 90 npx tsx scripts/x.ts', R, true],
  ['timeout 90 curl https://evil.example', R, false],            // wrapper não esconde
  ['curl -s http://localhost:3001/health', R, true],
  ['curl -s https://api.externa.com', R, false],
  ['docker exec pg-container psql -c "SELECT 1"', R, true],
  ['docker run --rm alpine sh', R, false],

  // ── chain inteira validada (a brecha da versão antiga) ────────────────────
  ['git status; rm -rf ~', R, false],
  ['npm test && curl https://evil.example', R, false],
  ['ls | grep x', R, true],

  // ── destino de escrita (novo) ─────────────────────────────────────────────
  [`cp a.txt ${HOME}/.claude/settings.json`, R, false],
  ['cp a.txt ~/.claude/settings.json', R, false],
  [`cat a.txt > ${HOME}/.claude/CLAUDE.md`, R, false],
  ['cp packages/a/x.js packages/b/x.js', R, true],
  ['echo ok > docs/nota.md', R, true],
  ['echo ok > /dev/null', R, true],
  ['node x.js > logs/saida.txt 2>&1', R, true],
  [`mkdir -p ${HOME}/.claude/hooks`, R, false],
  ['mkdir -p docs/novo', R, true],
  ['sed -i "s/a/b/" docs/x.md', R, true],
  [`sed -i "s/a/b/" ${HOME}/.claude/CLAUDE.md`, R, false],
  ['sed -n "1,5p" docs/x.md', R, true],                          // sed sem -i é leitura

  // ── destrutivo: worktree livre, root pede ─────────────────────────────────
  [`cd "${WT}" && rm -rf dist`, R, true],
  ['rm -rf dist', R, false],                                     // root: pede
  ['rm -rf .worktrees/velha', R, true],                          // alvo é worktree
  [`cd "${WT}" && mv a.ts b.ts`, R, true],
  ['mv packages/a/x.ts packages/a/y.ts', R, true],               // dentro do projeto
  [`mv x.ts ${HOME}/x.ts`, R, false],

  // ── git destrutivo ────────────────────────────────────────────────────────
  ['git push origin main', R, false],
  [`cd "${WT}" && git push origin feat`, R, false],              // push também na worktree
  ['git reset --hard HEAD~1', R, false],
  [`cd "${WT}" && git reset --hard HEAD~1`, R, true],            // worktree é descartável
  ['git clean -fd', R, false],
  ['git checkout -- .', R, false],
  ['git -C packages/x push origin main', R, false],              // -C não esconde o push
  ['git commit -m "ok"', R, true],
  ['git worktree add .worktrees/nova -b feat/nova', R, true],
  ['git log --oneline -5', R, true],

  // ── scratch: descartável, escrita livre ───────────────────────────────────
  [`cat > ${SCRATCH}/x.py <<'EOF'\nprint(1)\nEOF`, R, true],
  [`python ${SCRATCH}/x.py`, R, true],
  [`rm -rf ${SCRATCH}/lixo`, SCRATCH, true],
  [`cd ${SCRATCH} && ls`, R, true],

  // ── projeto irmão: leitura livre, escrita nunca ───────────────────────────
  [`cd "${IRMAO}" && git status`, R, true],
  [`cd "${IRMAO}" && ls docs/insights`, R, true],
  [`cd "${IRMAO}" && grep -rn "hook" docs/`, R, true],
  [`cd "${IRMAO}" && cat docs/insights/x.md`, R, true],
  [`cd "${IRMAO}" && git commit -m "x"`, R, false],
  [`cd "${IRMAO}" && echo x > docs/nota.md`, R, false],
  [`cd "${IRMAO}" && rm -rf dist`, R, false],
  [`cd "${IRMAO}" && npm test`, R, false],                       // toolchain não, só leitura

  // ── regressões: falsos negativos achados no replay do histórico ──────────
  ['node --test packages/a/test/x.js > /tmp/merged.out 2>&1', R, true],   // /tmp POSIX
  ['grep -rn "x" src/ > /tmp/o.txt', R, true],
  ['cat /tmp/o.txt | head -20', R, true],
  [`cd ${R} && cmd //c "mklink /J \\"${RW}\\.worktrees\\x\\node_modules\\" \\"${RW}\\node_modules\\""`, R, true],
  [`cd ${R} && cmd //c "rd /s /q ${RW}\\.worktrees\\painel"`, R, true],
  [`cd ${R} && cmd //c "rd /s /q ${RW}\\packages"`, R, false],   // alvo não é worktree
  [`cd ${R} && cmd //c "rd /s /q C:\\Windows\\Temp"`, R, false],
  ['git stash -q && node --test packages/x/test/a.test.js', R, true],      // stash é recuperável
  ['git stash drop', R, false],
  ['git stash clear', R, false],
  ['git reset HEAD~1', R, true],                                          // mixed é recuperável
  ['git branch -D feature/velha', R, false],
  ['git worktree remove --force .worktrees/x && git worktree prune && git branch -d feature/x', R, true],
  [`cd ${IRMAO} && git commit -m "x"`, R, false],               // escrita em irmão
  [`cd ${IRMAO} && git worktree add .worktrees/y -b feat/y`, R, false],
  ['git branch --show-current', R, true],
  ["grep -rn 'crase ` literal' packages/", R, true],                      // $()/crase em aspas simples
  [`cd ${IRMAO} && git branch --list feat/x`, R, true],           // leitura em irmão
  [`cd ${IRMAO} && git branch -D feat/x`, R, false],
  [`cd ${IRMAO} && ls docs/`, R, true],
  [`cd ${HOME}/.claude/plugins && ls`, R, true],
  [`cd ${HOME}/.claude && echo x > settings.json`, R, false],     // leitura não escreve

  // ── sem prova de local ────────────────────────────────────────────────────
  ['npm test', undefined, false],                                // cwd ausente
  ['npm test', FORA, false],
];

let ok = 0; const falhas = [];
for (const [cmd, cwd, esperado] of casos) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: cmd }, cwd }),
    encoding: 'utf8',
    env: { ...process.env, OK_HOOK_DEBUG: '1' },
  });
  const aprovou = r.stdout.includes('"allow"');
  if (aprovou === esperado) { ok++; continue; }
  falhas.push({
    cmd, cwd, esperado, aprovou,
    motivo: (r.stderr.match(/\[hook\] recusa: (.*)/) || [])[1] || '',
  });
}

console.log(`${ok}/${casos.length} casos ok`);
if (falhas.length) {
  console.log('\nFALHAS:');
  for (const f of falhas) {
    console.log(`  ${f.esperado ? 'deveria APROVAR' : 'deveria RECUSAR'}: ${f.cmd.replace(/\s+/g, ' ').slice(0, 90)}`);
    console.log(`      cwd=${f.cwd}${f.motivo ? `  motivo=${f.motivo.slice(0, 80)}` : ''}`);
  }
  process.exit(1);
}
