import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerSettings, mesclarSettings } from '../lib/settings.mjs';

const SCRIPTS = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CANON = 'node ${CLAUDE_PROJECT_DIR}/.claude/hooks/auto-approve-project-bash.mjs';
const LEG_W = 'node ${CLAUDE_PROJECT_DIR}/.claude/hooks/auto-approve-worktree-bash.js';
const LEG_P = 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/auto-approve-project-bash.js"';

const snippet = () => ({
  legado: { allow: ['Bash(rm *)', 'Bash(mv *)'], hooks: ['auto-approve-worktree-bash.js', 'auto-approve-project-bash.js'] },
  permissions: { allow: ['Bash(git *)', 'Bash(rm -rf *.worktrees/*)'], deny: [] },
  hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: CANON }] }] },
});
const cmd = (c) => ({ type: 'command', command: c });

function proj(texto) {
  const p = mkdtempSync(join(tmpdir(), 'okpb-settings-'));
  if (texto != null) {
    mkdirSync(join(p, '.claude'), { recursive: true });
    writeFileSync(join(p, '.claude/settings.json'), typeof texto === 'string' ? texto : JSON.stringify(texto, null, 2));
  }
  return p;
}
const ler = (p) => readFileSync(join(p, '.claude/settings.json'), 'utf8');
const aplicar = (p, m, snip = snippet()) => mesclarSettings(lerSettings(p), snip, m);

test('remove do allow as regras legadas e relata', () => {
  const p = proj({ permissions: { allow: ['Bash(rm *)', 'Bash(ls *)', 'Bash(mv *)'] } });
  const m = { paths: {} };
  const rel = aplicar(p, m);
  const st = JSON.parse(ler(p));
  assert.equal(st.permissions.allow.includes('Bash(rm *)'), false);
  assert.equal(st.permissions.allow.includes('Bash(mv *)'), false);
  assert.ok(st.permissions.allow.includes('Bash(ls *)'));
  assert.ok(st.permissions.allow.includes('Bash(rm -rf *.worktrees/*)'), 'a regra de worktree do canon não é legado');
  assert.ok(rel.includes('removido allow Bash(rm *)'));
  assert.ok(rel.includes('removido allow Bash(mv *)'));
  assert.deepEqual(m.settings.legado.allow, ['Bash(rm *)', 'Bash(mv *)']);
});

test('não remove de novo depois de registrado, mesmo que o dono re-adicione', () => {
  const p = proj({ permissions: { allow: ['Bash(rm *)'] } });
  const m = { paths: {} };
  aplicar(p, m);
  const st = JSON.parse(ler(p));
  st.permissions.allow.push('Bash(rm *)');
  writeFileSync(join(p, '.claude/settings.json'), JSON.stringify(st, null, 2));
  const rel = aplicar(p, JSON.parse(JSON.stringify(m)));
  assert.deepEqual(rel, []);
  assert.ok(JSON.parse(ler(p)).permissions.allow.includes('Bash(rm *)'));
});

test('troca o comando do hook legado pelo canônico do mesmo matcher', () => {
  const p = proj({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [cmd(LEG_W)] }] } });
  const m = { paths: {} };
  const rel = aplicar(p, m);
  const st = JSON.parse(ler(p));
  assert.equal(st.hooks.PreToolUse.length, 1);
  assert.deepEqual(st.hooks.PreToolUse[0].hooks, [cmd(CANON)]);
  assert.deepEqual(rel, [`hook legado trocado: ${LEG_W} → ${CANON}`]);
  assert.deepEqual(m.settings.legado.hooks, ['auto-approve-worktree-bash.js', 'auto-approve-project-bash.js']);
});

test('legado e canônico na mesma lista: o legado sai e o canônico não duplica', () => {
  const p = proj({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [cmd(LEG_P), cmd(CANON)] }] } });
  aplicar(p, { paths: {} });
  assert.deepEqual(JSON.parse(ler(p)).hooks.PreToolUse[0].hooks, [cmd(CANON)]);
  // dois legados juntos: o primeiro vira canônico, o segundo sai
  const q = proj({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [cmd(LEG_W), cmd(LEG_P)] }] } });
  aplicar(q, { paths: {} });
  assert.deepEqual(JSON.parse(ler(q)).hooks.PreToolUse[0].hooks, [cmd(CANON)]);
});

test('preserva outro hook do mesmo matcher, na mesma posição', () => {
  const proprio = cmd('node ${CLAUDE_PROJECT_DIR}/.claude/hooks/auto-approve-bench.js');
  const outro = { matcher: 'Edit', hooks: [cmd('node x.js')] };
  const p = proj({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [cmd(LEG_W), proprio] }, outro] } });
  aplicar(p, { paths: {} });
  const st = JSON.parse(ler(p));
  assert.deepEqual(st.hooks.PreToolUse[0].hooks, [cmd(CANON), proprio]);
  assert.deepEqual(st.hooks.PreToolUse[1], outro);
});

test('hook legado em matcher que o snippet não conhece fica como está', () => {
  const e = { matcher: 'Edit', hooks: [cmd(LEG_W)] };
  const p = proj({ hooks: { PreToolUse: [e] } });
  const rel = aplicar(p, { paths: {} });
  assert.deepEqual(JSON.parse(ler(p)).hooks.PreToolUse[0], e);
  assert.deepEqual(rel, [`hook legado em matcher sem canônico, mantido: Edit → ${LEG_W}`]);
});

test('preserva BOM, CRLF e indentação', () => {
  const orig = '﻿{\r\n    "permissions": {\r\n        "allow": [\r\n            "Bash(rm *)"\r\n        ]\r\n    },\r\n    "hooks": {\r\n        "PreToolUse": [\r\n            { "matcher": "Bash", "hooks": [{ "type": "command", "command": "node .claude/hooks/auto-approve-worktree-bash.js" }] }\r\n        ]\r\n    }\r\n}\r\n';
  const p = proj(orig);
  aplicar(p, { paths: {} });
  const t = ler(p);
  assert.ok(t.startsWith('﻿{'));
  assert.equal(t.replace(/\r\n/g, '').includes('\n'), false, 'EOL todo CRLF');
  assert.ok(t.includes('\r\n    "permissions"'));
  assert.ok(t.endsWith('}\r\n'));
  assert.equal(t.includes('Bash(rm *)'), false);
  assert.ok(t.includes('auto-approve-project-bash.mjs'));
});

test('projeto sem settings: só o snippet, sem relato de legado', () => {
  const p = proj(null);
  const m = { paths: {} };
  const rel = aplicar(p, m);
  assert.deepEqual(rel, []);
  const st = JSON.parse(ler(p));
  assert.deepEqual(st.permissions.allow, ['Bash(git *)', 'Bash(rm -rf *.worktrees/*)']);
  assert.deepEqual(st.hooks.PreToolUse, snippet().hooks.PreToolUse);
  assert.deepEqual(m.settings.allow, ['Bash(git *)', 'Bash(rm -rf *.worktrees/*)']);
  assert.deepEqual(m.settings.hooks, ['PreToolUse:Bash']);
});

test('snippet sem legado: comportamento antigo, nada removido', () => {
  const p = proj({ permissions: { allow: ['Bash(rm *)'] }, hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [cmd(LEG_W)] }] } });
  const snip = snippet();
  delete snip.legado;
  const rel = aplicar(p, { paths: {} }, snip);
  const st = JSON.parse(ler(p));
  assert.deepEqual(rel, []);
  assert.ok(st.permissions.allow.includes('Bash(rm *)'));
  assert.deepEqual(st.hooks.PreToolUse[0].hooks, [cmd(LEG_W)]);
});

test('arquivo de hook legado no disco: avisa e não apaga', () => {
  const p = proj({});
  mkdirSync(join(p, '.claude/hooks'), { recursive: true });
  writeFileSync(join(p, '.claude/hooks/auto-approve-worktree-bash.js'), '// legado');
  const rel = aplicar(p, { paths: {} });
  assert.deepEqual(rel, ['arquivo de hook legado no disco, remova: .claude/hooks/auto-approve-worktree-bash.js']);
  assert.ok(existsSync(join(p, '.claude/hooks/auto-approve-worktree-bash.js')));
});

test('o snippet real traz legado com rm, mv e os dois hooks 0.x', () => {
  const real = JSON.parse(readFileSync(join(SCRIPTS, '../assets/settings-snippet.json'), 'utf8'));
  assert.deepEqual(real.legado.allow, ['Bash(rm *)', 'Bash(mv *)']);
  assert.deepEqual(real.legado.hooks.sort(), ['auto-approve-project-bash.js', 'auto-approve-worktree-bash.js']);
  assert.equal(real.permissions.allow.includes('Bash(rm *)'), false);
});

test('canônico excluído do projeto (e ausente do disco): não troca, avisa e não registra', () => {
  const p = proj({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [cmd(LEG_W)] }] } });
  mkdirSync(join(p, '.claude/hooks'), { recursive: true });
  writeFileSync(join(p, '.claude/hooks/auto-approve-worktree-bash.js'), '// legado');
  const m = { paths: {}, itens: { 'hook:auto-approve-project-bash.mjs': { estado: 'excluido' } } };
  const rel = aplicar(p, m);
  assert.deepEqual(rel, ['hook legado mantido: canônico excluído do projeto (auto-approve-project-bash.mjs)']);
  assert.deepEqual(JSON.parse(ler(p)).hooks.PreToolUse[0].hooks, [cmd(LEG_W)]);
  assert.equal(m.settings.legado.hooks.includes('auto-approve-worktree-bash.js'), false);
  // apply futuro, com o hook incluído: troca
  m.itens['hook:auto-approve-project-bash.mjs'] = { estado: 'materializado' };
  const rel2 = aplicar(p, m);
  assert.ok(rel2.includes(`hook legado trocado: ${LEG_W} → ${CANON}`));
  assert.deepEqual(JSON.parse(ler(p)).hooks.PreToolUse[0].hooks, [cmd(CANON)]);
});

test('canônico excluído no manifesto mas já no disco: troca', () => {
  const p = proj({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [cmd(LEG_W)] }] } });
  mkdirSync(join(p, '.claude/hooks'), { recursive: true });
  writeFileSync(join(p, '.claude/hooks/auto-approve-project-bash.mjs'), '// canon');
  const m = { paths: {}, itens: { 'hook:auto-approve-project-bash.mjs': { estado: 'excluido' } } };
  aplicar(p, m);
  assert.deepEqual(JSON.parse(ler(p)).hooks.PreToolUse[0].hooks, [cmd(CANON)]);
});

test('canônico em outra entrada com o mesmo matcher: o legado só sai', () => {
  const proprio = cmd('node x/auto-approve-bench.js');
  const p = proj({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [cmd(LEG_W), proprio] }, { matcher: 'Bash', hooks: [cmd(CANON)] }] } });
  aplicar(p, { paths: {} });
  assert.deepEqual(JSON.parse(ler(p)).hooks.PreToolUse, [{ matcher: 'Bash', hooks: [proprio] }, { matcher: 'Bash', hooks: [cmd(CANON)] }]);
  // entrada que só tinha o legado some, para não sobrar matcher vazio
  const q = proj({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [cmd(LEG_W)] }, { matcher: 'Bash', hooks: [cmd(CANON)] }] } });
  aplicar(q, { paths: {} });
  assert.deepEqual(JSON.parse(ler(q)).hooks.PreToolUse, [{ matcher: 'Bash', hooks: [cmd(CANON)] }]);
});

test('ask: mescla uma vez e não volta depois que o dono remove', () => {
  const p = proj({ permissions: { allow: ['Bash(git *)'] } });
  const m = { itens: {} };
  const snip = { ...snippet(), permissions: { ...snippet().permissions, ask: ['Bash(git stash drop*)'] } };
  aplicar(p, m, snip);
  assert.deepEqual(JSON.parse(ler(p)).permissions.ask, ['Bash(git stash drop*)']);
  const sem = JSON.parse(ler(p));
  sem.permissions.ask = [];
  writeFileSync(join(p, '.claude/settings.json'), JSON.stringify(sem, null, 2));
  aplicar(p, m, snip);
  assert.deepEqual(JSON.parse(ler(p)).permissions.ask, []);
});

test('snippet real: ask cobre o git de estado compartilhado nos dois shells', () => {
  const real = JSON.parse(readFileSync(join(SCRIPTS, '..', 'assets/settings-snippet.json'), 'utf8'));
  for (const c of ['git stash drop', 'git branch -D', 'git worktree remove', 'git tag -d'])
    for (const sh of ['Bash', 'PowerShell']) assert.ok(real.permissions.ask.includes(`${sh}(${c}*)`), `${sh}(${c}*)`);
});

test('legado em matcher sem canônico: fica, não registra, não manda remover; trocando o matcher, o apply seguinte troca', () => {
  const p = proj({ hooks: { PreToolUse: [{ matcher: 'Bash|PowerShell', hooks: [cmd(LEG_W)] }] } });
  mkdirSync(join(p, '.claude/hooks'), { recursive: true });
  writeFileSync(join(p, '.claude/hooks/auto-approve-worktree-bash.js'), '// legado');
  const m = { paths: {} };
  const rel = aplicar(p, m);
  assert.deepEqual(rel, [`hook legado em matcher sem canônico, mantido: Bash|PowerShell → ${LEG_W}`]);
  assert.deepEqual(JSON.parse(ler(p)).hooks.PreToolUse[0].hooks, [cmd(LEG_W)]);
  assert.equal(m.settings.legado.hooks.includes('auto-approve-worktree-bash.js'), false);
  // outro evento, mesmo tratamento
  const q = proj({ hooks: { PostToolUse: [{ matcher: 'Bash', hooks: [cmd(LEG_P)] }] } });
  assert.match(aplicar(q, { paths: {} })[0], /^hook legado em matcher sem canônico, mantido: Bash → /);
  // o dono troca o matcher para Bash: o próximo apply troca e registra
  const st = JSON.parse(ler(p));
  assert.equal(st.hooks.PreToolUse.length, 2, 'o canônico do snippet foi acrescentado ao lado');
  st.hooks.PreToolUse = [{ matcher: 'Bash', hooks: [cmd(LEG_W)] }];
  writeFileSync(join(p, '.claude/settings.json'), JSON.stringify(st, null, 2));
  const rel2 = aplicar(p, m);
  assert.ok(rel2.includes(`hook legado trocado: ${LEG_W} → ${CANON}`));
  assert.ok(m.settings.legado.hooks.includes('auto-approve-worktree-bash.js'));
  assert.ok(rel2.includes('arquivo de hook legado no disco, remova: .claude/hooks/auto-approve-worktree-bash.js'));
});
