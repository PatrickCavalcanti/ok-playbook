#!/usr/bin/env node
/**
 * PASSO 3 do diagnóstico: passar TODOS os comandos históricos pelo hook e medir
 * a cobertura real — antes e depois de mexer nele.
 *
 *   node .claude/hooks/tools/hook-replay.mjs            # cobertura + heads recusados
 *   node .claude/hooks/tools/hook-replay.mjs --porques  # agrupa pelo MOTIVO da recusa
 *   node .claude/hooks/tools/hook-replay.mjs --hook <path>   # compara outra versão
 *
 * O modo `--porques` liga OK_HOOK_DEBUG no hook e agrupa as explicações. É ele
 * que diz se a recusa é legítima (comando fora das áreas conhecidas, destrutivo
 * no root, escrita em projeto irmão) ou um falso negativo do parser (formato
 * que o hook não entendeu). Só o segundo grupo justifica mexer no código.
 *
 * Cada comando roda o hook como subprocesso — some centenas de spawns, leva
 * ~1 min. Assume cwd = root do projeto.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv;
// `--tool PowerShell` replaya as chamadas da tool PowerShell contra o hook de
// PS. Os dois shells têm a mesma doença (comando começando com mudança de
// diretório), então os dois precisam de cobertura medida.
const TOOL = argv.includes('--tool') ? argv[argv.indexOf('--tool') + 1] : 'Bash';
const PADRAO = TOOL.toLowerCase() === 'powershell'
  ? 'auto-approve-project-powershell.mjs'
  : 'auto-approve-project-bash.mjs';
const HOOK = argv.includes('--hook')
  ? argv[argv.indexOf('--hook') + 1]
  : path.join(aqui, '..', PADRAO);
const PORQUES = argv.includes('--porques');
const CWD = process.cwd();

const slug = CWD.replace(/[^a-zA-Z0-9]/g, '-');
const dir = path.join(os.homedir(), '.claude', 'projects', slug);
if (!fs.existsSync(dir)) { console.error(`Transcripts não encontrados em ${dir}`); process.exit(1); }

const cmds = new Map();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) {
  for (const linha of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
    if (!linha.trim()) continue;
    let e; try { e = JSON.parse(linha); } catch { continue; }
    const c = e && e.message && e.message.content;
    if (!Array.isArray(c)) continue;
    for (const b of c) {
      if (b.type !== 'tool_use' || b.name !== TOOL) continue;
      const cmd = String((b.input && b.input.command) || '').trim();
      if (cmd) cmds.set(cmd, (cmds.get(cmd) || 0) + 1);
    }
  }
}

let okN = 0; let naoN = 0;
const grupos = new Map();
for (const [cmd, n] of cmds) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: TOOL, tool_input: { command: cmd }, cwd: CWD }),
    encoding: 'utf8',
    env: PORQUES ? { ...process.env, OK_HOOK_DEBUG: '1' } : process.env,
  });
  if (r.stdout.includes('"allow"')) { okN += n; continue; }
  naoN += n;
  const chave = PORQUES
    ? ((r.stderr.match(/\[hook\] recusa: (.*)/) || [])[1] || '(sem motivo)')
      .replace(/ em ".*/, ' em …').replace(/(: ).*/, '$1…')
    : cmd.replace(/^cd\s+(?:\/d\s+)?(?:"[^"]*"|'[^']*'|\S+)\s*(?:&&|;)?\s*/i, '')
      .split(/\s+/)[0].replace(/^["']/, '') || '(só cd)';
  if (!grupos.has(chave)) grupos.set(chave, { n: 0, ex: cmd });
  grupos.get(chave).n += n;
}

const total = okN + naoN;
console.log(`hook: ${HOOK}`);
console.log(`chamadas: ${okN} aprovadas / ${naoN} não-aprovadas → cobertura ${(100 * okN / total).toFixed(1)}%`);
console.log(`\n${PORQUES ? 'motivos' : 'heads'} das recusas:`);
[...grupos.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 25).forEach(([k, v]) => {
  console.log(`  ${String(v.n).padStart(4)}  ${k.slice(0, 88)}`);
  console.log(`        ex: ${v.ex.replace(/\s+/g, ' ').slice(0, 100)}`);
});
