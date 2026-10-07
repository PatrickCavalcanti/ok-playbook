#!/usr/bin/env node
/**
 * PASSO 1 do diagnóstico de prompts de permissão: medir o FORMATO dos comandos.
 *
 *   node .claude/hooks/tools/medir-comandos.mjs
 *
 * Varre os transcripts desta sessão-projeto e mostra (a) quantos comandos Bash
 * começam com `cd`, (b) para onde esses `cd` apontam, (c) os heads mais usados.
 *
 * POR QUE ISSO PRIMEIRO: o sintoma "peço permissão o tempo todo mesmo com o
 * allowlist certo" quase nunca é falta de regra — é FORMATO de comando. Uma
 * rule `Bash(npm *)` não cobre `cd "<projeto>" && npm test`, porque o matcher
 * trata `cd` como context-changing. Sem medir, você empilha regras que nunca
 * vão casar. Rode isto ANTES de editar qualquer allowlist ou whitelist.
 *
 * Independe do hook — só lê transcripts. Genérico: roda em qualquer projeto.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// O diretório de transcripts é o cwd com todo não-alfanumérico virando `-`.
const slug = process.cwd().replace(/[^a-zA-Z0-9]/g, '-');
const dir = process.argv.includes('--project-dir')
  ? process.argv[process.argv.indexOf('--project-dir') + 1]
  : path.join(os.homedir(), '.claude', 'projects', slug);

if (!fs.existsSync(dir)) {
  console.error(`Transcripts não encontrados em ${dir}`);
  console.error('Passe o caminho com --project-dir <path>.');
  process.exit(1);
}

// `e:/proj/x` e `/e/proj/x` (Git Bash) são o mesmo lugar — compare sem o drive.
const semDrive = (p) => p.replace(/\\/g, '/').toLowerCase().replace(/^([a-z]:|\/[a-z])(?=\/)/, '');
const raiz = semDrive(process.cwd());
const heads = {};
const formato = { com_cd: 0, sem_cd: 0 };
const alvosCd = {};

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) {
  for (const linha of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
    if (!linha.trim()) continue;
    let e; try { e = JSON.parse(linha); } catch { continue; }
    const c = e && e.message && e.message.content;
    if (!Array.isArray(c)) continue;
    for (const b of c) {
      if (b.type !== 'tool_use' || b.name !== 'Bash') continue;
      const cmd = String((b.input && b.input.command) || '').trim();
      if (!cmd) continue;
      if (/^cd\s+/i.test(cmd)) {
        formato.com_cd++;
        const bruto = (cmd.match(/^cd\s+(?:\/d\s+)?("[^"]*"|'[^']*'|\S+)/i) || [])[1] || '?';
        const n = semDrive(bruto.replace(/^["']|["']$/g, '')).replace(/[;&]+$/, '');
        const chave = n.includes('.worktrees') ? '<projeto>/.worktrees/…'
          : n === raiz ? '<projeto> (root)'
          : n;
        alvosCd[chave] = (alvosCd[chave] || 0) + 1;
      } else formato.sem_cd++;
      const h = cmd.replace(/^cd\s+\S+\s+&&\s+/i, '').split(/\s+/)[0].replace(/^["']/, '');
      heads[h] = (heads[h] || 0) + 1;
    }
  }
}

const total = formato.com_cd + formato.sem_cd;
console.log(`total de chamadas Bash: ${total}`);
console.log(`  com cd: ${formato.com_cd} (${(100 * formato.com_cd / total).toFixed(0)}%)  — não casam rule simples`);
console.log(`  sem cd: ${formato.sem_cd}`);
console.log('\nalvos de cd (os de fora do projeto viram áreas de leitura/scratch):');
Object.entries(alvosCd).sort((a, b) => b[1] - a[1]).slice(0, 15)
  .forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
console.log('\nheads mais usados (calibre o WHITELIST com isto):');
Object.entries(heads).sort((a, b) => b[1] - a[1]).slice(0, 30)
  .forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
