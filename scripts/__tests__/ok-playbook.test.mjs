import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  w('assets/settings-snippet.json', JSON.stringify({ permissions: { allow: ['Bash(git *)'], deny: ['Bash(git push --force*)'] } }));
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
