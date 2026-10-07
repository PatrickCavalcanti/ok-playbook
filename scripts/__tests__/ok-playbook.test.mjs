import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPTS = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function skillSintetica() {
  const raiz = mkdtempSync(join(tmpdir(), 'okpb-skill-'));
  cpSync(SCRIPTS, join(raiz, 'scripts'), { recursive: true });
  const w = (p, t) => { mkdirSync(dirname(join(raiz, p)), { recursive: true }); writeFileSync(join(raiz, p), t); };
  w('VERSION', '1.0.0\n');
  w('assets/rules.md', '## Regras\nLeia <playbook-root>patterns/dev.md\n');
  w('references/agents/docs-review.md', '---\ndescription: "D"\nwhen_to_use: "W <backlog-root>"\n---\n# DR\n');
  w('references/patterns/dev.md', '# Dev\n');
  w('assets/templates/feedback.md', '# Feedback\n');
  w('assets/settings-snippet.json', JSON.stringify({ permissions: { allow: ['Bash(git *)'], deny: ['Bash(git push --force*)'] }, _comment: 'x', hooks: { _comment_h: 'x', PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node ${CLAUDE_PROJECT_DIR}/.claude/hooks/a.mjs' }] }] } }));
  return raiz;
}

function projeto(manifesto = { paths: {} }) {
  const p = mkdtempSync(join(tmpdir(), 'okpb-proj-'));
  writeFileSync(join(p, 'ok-playbook.json'), JSON.stringify(manifesto));
  return p;
}

const rodar = (skill, ...a) => {
  const r = spawnSync(process.execPath, [join(skill, 'scripts/ok-playbook.mjs'), ...a], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout.trim(), ultima: r.stdout.trim().split('\n').pop() };
};
const ler = (p, rel) => readFileSync(join(p, rel), 'utf8');

test('sem manifesto → FALTA', () => {
  const s = skillSintetica();
  const p = mkdtempSync(join(tmpdir(), 'okpb-vazio-'));
  const r = rodar(s, 'status', '--projeto', p);
  assert.equal(r.code, 1);
  assert.match(r.ultima, /^FALTA: ok-playbook\.json ausente/);
});

test('flag desconhecida → FALTA, não roda', () => {
  const s = skillSintetica();
  const r = rodar(s, 'apply', '--projeto', projeto(), '--forca', 'x');
  assert.equal(r.code, 1);
  assert.match(r.ultima, /flag desconhecida/);
});

test('apply em projeto vazio materializa tudo e status fica OK', () => {
  const s = skillSintetica();
  const p = projeto();
  const a = rodar(s, 'apply', '--projeto', p);
  assert.equal(a.code, 0, a.out);
  assert.match(ler(p, 'CLAUDE.md'), /Leia docs\/ok-playbook\/patterns\/dev\.md/);
  assert.match(ler(p, '.claude/skills/docs-review/SKILL.md'), /^---\nname: docs-review\n/);
  assert.equal(ler(p, '.agents/skills/docs-review/SKILL.md'), ler(p, '.claude/skills/docs-review/SKILL.md'));
  assert.equal(ler(p, 'docs/ok-playbook/patterns/dev.md'), '# Dev\n');
  assert.equal(ler(p, 'docs/agent-feedback/_template.md'), '# Feedback\n');
  const settings = JSON.parse(ler(p, '.claude/settings.json'));
  assert.deepEqual(settings.permissions.deny, ['Bash(git push --force*)']);
  const m = JSON.parse(ler(p, 'ok-playbook.json'));
  assert.equal(m.playbook.versao, '1.0.0');
  assert.equal(m.itens['regras:CLAUDE.md'].estado, 'materializado');
  assert.equal(rodar(s, 'status', '--projeto', p).code, 0);
});

test('canon muda → atualizavel → apply atualiza sem tocar o resto do CLAUDE.md', () => {
  const s = skillSintetica();
  const p = projeto();
  writeFileSync(join(p, 'CLAUDE.md'), '# Meu projeto\nregra local\n');
  rodar(s, 'apply', '--projeto', p);
  writeFileSync(join(s, 'assets/rules.md'), '## Regras v2\n');
  assert.match(rodar(s, 'plan', '--projeto', p).out, /atualizavel\tregras:CLAUDE\.md/);
  assert.equal(rodar(s, 'status', '--projeto', p).code, 1);
  assert.equal(rodar(s, 'apply', '--projeto', p).code, 0);
  const c = ler(p, 'CLAUDE.md');
  assert.match(c, /## Regras v2/);
  assert.ok(c.endsWith('# Meu projeto\nregra local\n'));
});

test('edição local → editado; --manter vira customizado e status OK', () => {
  const s = skillSintetica();
  const p = projeto();
  rodar(s, 'apply', '--projeto', p);
  writeFileSync(join(p, 'docs/ok-playbook/patterns/dev.md'), '# Dev local\n');
  const a = rodar(s, 'apply', '--projeto', p);
  assert.equal(a.code, 1);
  assert.match(a.out, /editado\tpattern:dev\.md/);
  assert.equal(ler(p, 'docs/ok-playbook/patterns/dev.md'), '# Dev local\n');
  assert.equal(rodar(s, 'apply', '--projeto', p, '--manter', 'pattern:dev.md').code, 0);
  assert.equal(rodar(s, 'status', '--projeto', p).code, 0);
  writeFileSync(join(s, 'references/patterns/dev.md'), '# Dev v2\n');
  assert.match(rodar(s, 'status', '--projeto', p).out, /customizado-canon-mudou\tpattern:dev\.md/);
});

test('arquivo pré-existente diferente → conflito; --so sobrescreve', () => {
  const s = skillSintetica();
  const p = projeto();
  mkdirSync(join(p, '.claude/skills/docs-review'), { recursive: true });
  writeFileSync(join(p, '.claude/skills/docs-review/SKILL.md'), 'ponteiro antigo\n');
  const a = rodar(s, 'apply', '--projeto', p);
  assert.match(a.out, /conflito\tskill:\.claude\/skills\/docs-review/);
  assert.equal(rodar(s, 'apply', '--projeto', p, '--so', 'skill:.claude/skills/docs-review').code, 0);
  assert.match(ler(p, '.claude/skills/docs-review/SKILL.md'), /^---\nname: docs-review/);
});

test('--sem exclui; --do-projeto registra e status cobra existência', () => {
  const s = skillSintetica();
  const p = projeto();
  writeFileSync(join(p, 'AGENTS.md'), 'leia o CLAUDE.md\n');
  assert.equal(rodar(s, 'apply', '--projeto', p, '--sem', 'regras:AGENTS.md', '--do-projeto', 'scripts/suite.mjs').code, 1);
  assert.equal(ler(p, 'AGENTS.md'), 'leia o CLAUDE.md\n');
  mkdirSync(join(p, 'scripts'));
  writeFileSync(join(p, 'scripts/suite.mjs'), '');
  assert.equal(rodar(s, 'status', '--projeto', p).code, 0);
});

test('item que sai do canon → orfao', () => {
  const s = skillSintetica();
  const p = projeto();
  rodar(s, 'apply', '--projeto', p);
  rmSync(join(s, 'references/agents/docs-review.md'));
  assert.match(rodar(s, 'status', '--projeto', p).out, /orfao\tskill:\.claude\/skills\/docs-review/);
});

test('apply registra hooks do snippet em projeto sem settings', () => {
  const s = skillSintetica();
  const p = projeto();
  rodar(s, 'apply', '--projeto', p);
  const st = JSON.parse(ler(p, '.claude/settings.json'));
  assert.equal(st.hooks.PreToolUse.length, 1);
  assert.equal(st.hooks.PreToolUse[0].matcher, 'Bash');
  assert.match(st.hooks.PreToolUse[0].hooks[0].command, /hooks[\\/]a\.mjs/);
  assert.equal(Object.keys(st.hooks).some((k) => k.startsWith('_comment')), false);
});

test('matcher Bash do projeto fica intacto, sem duplicar', () => {
  const s = skillSintetica();
  const p = projeto();
  const dele = { matcher: 'Bash', hooks: [{ type: 'command', command: 'node meu.mjs' }] };
  mkdirSync(join(p, '.claude'), { recursive: true });
  writeFileSync(join(p, '.claude/settings.json'), JSON.stringify({ hooks: { PreToolUse: [dele] } }));
  rodar(s, 'apply', '--projeto', p);
  const st = JSON.parse(ler(p, '.claude/settings.json'));
  assert.deepEqual(st.hooks.PreToolUse, [dele]);
});

test('apply duas vezes é idempotente nos settings', () => {
  const s = skillSintetica();
  const p = projeto();
  rodar(s, 'apply', '--projeto', p);
  const um = ler(p, '.claude/settings.json');
  rodar(s, 'apply', '--projeto', p);
  assert.equal(ler(p, '.claude/settings.json'), um);
});

// ---- correções de review (I1, I3, I4, M6) ----
test('I1: raiz do projeto entra em minúsculas nos hooks', () => {
  const s = skillSintetica();
  mkdirSync(join(s, 'assets/hooks/lib'), { recursive: true });
  writeFileSync(join(s, 'assets/hooks/lib/areas.mjs'), "const P = '<PROJECT_ROOT>';\n");
  const base = mkdtempSync(join(tmpdir(), 'okpb-'));
  const p = join(base, 'MeuProjeto');
  mkdirSync(p);
  writeFileSync(join(p, 'ok-playbook.json'), '{"paths":{}}');
  assert.equal(rodar(s, 'apply', '--projeto', p).code, 0);
  const t = ler(p, '.claude/hooks/lib/areas.mjs');
  assert.match(t, /meuprojeto'/);
  assert.equal(/[A-Z]/.test(t.replace('const P', '')), false);
});

test('I3: CLAUDE.md CRLF → só o bloco é inserido, resto byte a byte', () => {
  const s = skillSintetica();
  const p = projeto();
  const orig = '# Meu\r\n\r\nregra\r\nlocal\r\n';
  writeFileSync(join(p, 'CLAUDE.md'), orig);
  assert.equal(rodar(s, 'apply', '--projeto', p).code, 0);
  const novo = ler(p, 'CLAUDE.md');
  assert.equal(novo.replace(/\r\n/g, '').includes('\n'), false);
  assert.ok(novo.endsWith(orig));
});

test('I3: AGENTS.md com BOM+CRLF → BOM só no byte 0; arquivo existente mantém EOL', () => {
  const s = skillSintetica();
  const p = projeto();
  writeFileSync(join(p, 'AGENTS.md'), '\uFEFFleia\r\n');
  assert.equal(rodar(s, 'apply', '--projeto', p).code, 0);
  const b = readFileSync(join(p, 'AGENTS.md'));
  assert.deepEqual([...b.subarray(0, 3)], [0xEF, 0xBB, 0xBF]);
  assert.equal(ler(p, 'AGENTS.md').lastIndexOf('\uFEFF'), 0);
  const alvo = join(p, 'docs/ok-playbook/patterns/dev.md');
  writeFileSync(alvo, '# Dev\r\n');
  writeFileSync(join(s, 'references/patterns/dev.md'), '# Dev v2\nlinha\n');
  assert.equal(rodar(s, 'apply', '--projeto', p, '--so', 'pattern:dev.md').code, 0);
  assert.equal(readFileSync(alvo, 'utf8'), '# Dev v2\r\nlinha\r\n');
});

test('I4a: settings inválido (comentário) → FALTA e nada escrito; --sem settings segue', () => {
  const s = skillSintetica();
  const p = projeto();
  mkdirSync(join(p, '.claude'));
  writeFileSync(join(p, '.claude/settings.json'), '{\n // oi\n "a": 1\n}\n');
  const r = rodar(s, 'apply', '--projeto', p);
  assert.equal(r.code, 1);
  assert.match(r.ultima, /^FALTA: \.claude\/settings\.json não é JSON válido \(.+\) — corrija ou use --sem settings$/);
  assert.equal(existsSync(join(p, 'CLAUDE.md')), false);
  assert.equal(ler(p, 'ok-playbook.json'), '{"paths":{}}');
  assert.equal(rodar(s, 'apply', '--projeto', p, '--sem', 'settings').code, 0);
  assert.equal(ler(p, '.claude/settings.json'), '{\n // oi\n "a": 1\n}\n');
  assert.deepEqual(JSON.parse(ler(p, 'ok-playbook.json')).itens.settings, { estado: 'excluido' });
});

test('I4a/d: settings com BOM, CRLF e indent 4 é aceito e preservado', () => {
  const s = skillSintetica();
  const p = projeto();
  mkdirSync(join(p, '.claude'));
  writeFileSync(join(p, '.claude/settings.json'), '\uFEFF{\r\n    "env": {\r\n        "X": "1"\r\n    }\r\n}\r\n');
  assert.equal(rodar(s, 'apply', '--projeto', p).code, 0);
  const t = ler(p, '.claude/settings.json');
  assert.equal(t.indexOf('\uFEFF'), 0);
  assert.equal(t.lastIndexOf('\uFEFF'), 0);
  assert.equal(t.replace(/\r\n/g, '').includes('\n'), false);
  assert.match(t, /\r\n    "env": \{/);
  const st = JSON.parse(t.slice(1));
  assert.equal(st.env.X, '1');
  assert.deepEqual(st.permissions.deny, ['Bash(git push --force*)']);
  rodar(s, 'apply', '--projeto', p);
  assert.equal(ler(p, '.claude/settings.json'), t);
});

test('I4d: tab como indentação é preservada', () => {
  const s = skillSintetica();
  const p = projeto();
  mkdirSync(join(p, '.claude'));
  writeFileSync(join(p, '.claude/settings.json'), '{\n\t"env": {}\n}\n');
  rodar(s, 'apply', '--projeto', p);
  assert.match(ler(p, '.claude/settings.json'), /\n\t"env": \{\}/);
});

test('I4b: o que o dono removeu depois não volta', () => {
  const s = skillSintetica();
  const p = projeto();
  rodar(s, 'apply', '--projeto', p);
  const alvo = join(p, '.claude/settings.json');
  const st = JSON.parse(readFileSync(alvo, 'utf8'));
  st.permissions.allow = st.permissions.allow.filter((r) => r !== 'Bash(git *)');
  delete st.hooks.PreToolUse;
  writeFileSync(alvo, JSON.stringify(st, null, 2));
  const m = JSON.parse(ler(p, 'ok-playbook.json'));
  assert.deepEqual(m.settings.allow, ['Bash(git *)']);
  assert.deepEqual(m.settings.hooks, ['PreToolUse:Bash']);
  rodar(s, 'apply', '--projeto', p);
  const depois = JSON.parse(readFileSync(alvo, 'utf8'));
  assert.equal((depois.permissions.allow ?? []).includes('Bash(git *)'), false);
  assert.equal(depois.hooks?.PreToolUse, undefined);
  assert.deepEqual(depois.permissions.deny, ['Bash(git push --force*)']);
});

test('I4b: regra nova no snippet depois é oferecida', () => {
  const s = skillSintetica();
  const p = projeto();
  rodar(s, 'apply', '--projeto', p);
  const snip = JSON.parse(readFileSync(join(s, 'assets/settings-snippet.json'), 'utf8'));
  snip.permissions.allow.push('Bash(ls *)');
  writeFileSync(join(s, 'assets/settings-snippet.json'), JSON.stringify(snip));
  rodar(s, 'apply', '--projeto', p);
  assert.ok(JSON.parse(ler(p, '.claude/settings.json')).permissions.allow.includes('Bash(ls *)'));
});

test('I4c: --sem settings pula o merge e registra excluido', () => {
  const s = skillSintetica();
  const p = projeto();
  assert.equal(rodar(s, 'apply', '--projeto', p, '--sem', 'settings').code, 0);
  assert.equal(existsSync(join(p, '.claude/settings.json')), false);
  assert.deepEqual(JSON.parse(ler(p, 'ok-playbook.json')).itens.settings, { estado: 'excluido' });
  rodar(s, 'apply', '--projeto', p);
  assert.equal(existsSync(join(p, '.claude/settings.json')), false);
});

test('M6a: id desconhecido → FALTA antes de escrever', () => {
  const s = skillSintetica();
  for (const f of ['--so', '--manter', '--sem']) {
    const p = projeto();
    const r = rodar(s, 'apply', '--projeto', p, f, 'regras:CLAUDE.mdd');
    assert.equal(r.code, 1);
    assert.equal(r.ultima, 'FALTA: id desconhecido: regras:CLAUDE.mdd');
    assert.equal(existsSync(join(p, 'CLAUDE.md')), false);
  }
});

test('M6b: start sem end → marcador-quebrado, não escreve aquele item', () => {
  const s = skillSintetica();
  const p = projeto();
  const quebrado = '<!-- ok-playbook:start v0.9 -->\nvelho\n\n# resto do dono\n';
  writeFileSync(join(p, 'CLAUDE.md'), quebrado);
  const r = rodar(s, 'apply', '--projeto', p);
  assert.equal(r.code, 1);
  assert.match(r.out, /marcador-quebrado\tregras:CLAUDE\.md\tCLAUDE\.md/);
  assert.equal(ler(p, 'CLAUDE.md'), quebrado);
  assert.equal(rodar(s, 'apply', '--projeto', p, '--so', 'regras:CLAUDE.md').code, 1);
  assert.equal(ler(p, 'CLAUDE.md'), quebrado);
  assert.match(ler(p, 'AGENTS.md'), /ok-playbook:end/);
  writeFileSync(join(p, 'CLAUDE.md'), 'solto\n<!-- ok-playbook:end -->\n');
  assert.match(rodar(s, 'plan', '--projeto', p).out, /marcador-quebrado\tregras:CLAUDE\.md/);
});

test('M6c: paths com \\ viram /', () => {
  const s = skillSintetica();
  const p = projeto({ paths: { backlog: 'docs\\fb' } });
  assert.equal(rodar(s, 'apply', '--projeto', p).code, 0);
  assert.equal(ler(p, 'docs/fb/_template.md'), '# Feedback\n');
});
