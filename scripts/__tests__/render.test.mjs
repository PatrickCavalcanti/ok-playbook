import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extrairBloco, hash, inserirBloco, renderSkill, resolverPlaceholders } from '../lib/render.mjs';
import { PADRAO } from '../lib/manifesto.mjs';

test('resolve placeholders e link de agente', () => {
  const t = resolverPlaceholders('ver <playbook-root>patterns/x.md e <playbook-root>agents/docs-review.md em <backlog-root>', PADRAO);
  assert.equal(t, 'ver docs/ok-playbook/patterns/x.md e .claude/skills/docs-review/SKILL.md em docs/agent-feedback/');
});

test('<project-root> fica intacto', () => {
  assert.equal(resolverPlaceholders('<project-root>/.worktrees', PADRAO), '<project-root>/.worktrees');
});

test('bloco: insere no topo, substitui depois sem tocar o resto', () => {
  const um = inserirBloco('# Projeto\n\nregra local\n', 'R1', '1.0.0');
  assert.match(um, /^<!-- ok-playbook:start v1\.0\.0 -->\nR1\n<!-- ok-playbook:end -->\n\n# Projeto/);
  const dois = inserirBloco(um, 'R2', '1.1.0');
  assert.equal(extrairBloco(dois), 'R2');
  assert.ok(dois.endsWith('# Projeto\n\nregra local\n'));
});

test('bloco: substitui o include legado', () => {
  const legado = '<!-- ok-playbook:include:start -->\r\n@packages/ok-playbook/install/claude-md-include.md\r\n<!-- ok-playbook:include:end -->\r\n\r\nresto\r\n';
  const novo = inserirBloco(legado, 'R', '1.0.0');
  assert.equal(extrairBloco(novo), 'R');
  assert.ok(!novo.includes('include:start'));
  assert.ok(novo.endsWith('resto\r\n'));
});

test('hash ignora CRLF', () => {
  assert.equal(hash('a\r\nb'), hash('a\nb'));
});

test('renderSkill: name + description + when_to_use, descarta o resto', () => {
  const s = renderSkill('docs-review', '---\ndescription: "D <backlog-root>"\nagent: "agent"\nwhen_to_use: "W"\n---\n\n# Corpo\n', PADRAO);
  assert.equal(s, '---\nname: docs-review\ndescription: "D docs/agent-feedback/"\nwhen_to_use: "W"\n---\n\n# Corpo\n');
});

test('renderSkill sem frontmatter falha', () => {
  assert.throws(() => renderSkill('x', '# sem', PADRAO), /sem frontmatter/);
});

test('M1: <x-root>/ não gera //', () => {
  assert.equal(resolverPlaceholders('<backlog-root>/session/ e <docs-root>x', PADRAO), 'docs/agent-feedback/session/ e docs/x');
});

test('I3: bloco em CRLF mantém CRLF e o resto byte a byte', () => {
  const orig = '# P\r\n\r\nlocal\r\n';
  const novo = inserirBloco(orig, 'R1\nR2', '1.0.0');
  assert.equal(novo.replace(/\r\n/g, '').includes('\n'), false);
  assert.ok(novo.endsWith(orig));
  const dois = inserirBloco(novo, 'R3', '1.1.0');
  assert.ok(dois.endsWith(orig));
  assert.equal(extrairBloco(dois), 'R3');
});

test('I3: BOM fica só no byte 0', () => {
  const novo = inserirBloco('\uFEFFlocal\r\n', 'R', '1.0.0');
  assert.equal(novo.indexOf('\uFEFF'), 0);
  assert.equal(novo.lastIndexOf('\uFEFF'), 0);
  const dois = inserirBloco(novo, 'R2', '1.1.0');
  assert.equal(dois.lastIndexOf('\uFEFF'), 0);
  assert.equal(extrairBloco(dois), 'R2');
  assert.equal(hash('\uFEFFa\r\nb'), hash('a\nb'));
});
