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

// D4: alvo de link markdown vira relativo ao arquivo de destino; o resto segue a partir da raiz
const SKILL = '.claude/skills/docs-review/SKILL.md';

test('D4: link de skill para pattern vira relativo ao diretório da skill', () => {
  assert.equal(
    resolverPlaceholders('[fl](<playbook-root>patterns/feedback-loop.md)', PADRAO, SKILL),
    '[fl](../../../docs/ok-playbook/patterns/feedback-loop.md)',
  );
});

test('D4: link de skill para outra skill (agents/x.md) vira o SKILL.md vizinho', () => {
  assert.equal(
    resolverPlaceholders('[n](<playbook-root>agents/new-agent.md)', PADRAO, SKILL),
    '[n](../new-agent/SKILL.md)',
  );
  assert.equal(
    resolverPlaceholders('[n](<playbook-root>agents/new-agent.md#passo-1)', PADRAO, SKILL),
    '[n](../new-agent/SKILL.md#passo-1)',
  );
});

test('D4: link de pattern para template', () => {
  assert.equal(
    resolverPlaceholders('[t](<playbook-root>templates/z.md)', PADRAO, 'docs/ok-playbook/patterns/y.md'),
    '[t](../templates/z.md)',
  );
});

test('D4: link de semente _index.md em arch para pattern', () => {
  assert.equal(
    resolverPlaceholders('[ds](<playbook-root>patterns/docs-structure.md)', PADRAO, 'docs/project-architecture/_index.md'),
    '[ds](../ok-playbook/patterns/docs-structure.md)',
  );
});

test('D4: âncora e título do link são preservados', () => {
  assert.equal(
    resolverPlaceholders('[a](<playbook-root>patterns/x.md#secao-2) [b](<arch-root>_index.md#a#b "t")', PADRAO, SKILL),
    '[a](../../../docs/ok-playbook/patterns/x.md#secao-2) [b](../../../docs/project-architecture/_index.md#a#b "t")',
  );
});

test('D4: todos os placeholders de caminho viram relativos em link', () => {
  const origem = 'docs/ok-playbook/patterns/y.md';
  const casos = {
    'docs-root': '../../x.md', 'arch-root': '../../project-architecture/x.md', 'agents-root': '../../project-architecture/agents/x.md',
    'superpowers-root': '../../superpowers/x.md', 'backlog-root': '../../agent-feedback/x.md', 'drafts-root': '../../_drafts/x.md',
    'insights-root': '../../insights/x.md', 'pendencias-root': '../../pendencias/x.md', 'playbook-root': '../x.md',
  };
  for (const [nome, rel] of Object.entries(casos))
    assert.equal(resolverPlaceholders(`[l](<${nome}>x.md)`, PADRAO, origem), `[l](${rel})`, nome);
});

test('D4: link para o próprio diretório e com barra final', () => {
  assert.equal(resolverPlaceholders('[d](<playbook-root>patterns/)', PADRAO, 'docs/ok-playbook/patterns/y.md'), '[d](./)');
  assert.equal(resolverPlaceholders('[d](<playbook-root>templates/)', PADRAO, 'docs/ok-playbook/patterns/y.md'), '[d](../templates/)');
});

test('D4: prosa, código inline e bloco de código seguem com o caminho a partir da raiz', () => {
  const entrada = 'ver <playbook-root>patterns/x.md e `<arch-root>_index.md` e <playbook-root>agents/new-agent.md\n```\n<backlog-root>session/\n```\n[l](<playbook-root>patterns/x.md)';
  assert.equal(
    resolverPlaceholders(entrada, PADRAO, SKILL),
    'ver docs/ok-playbook/patterns/x.md e `docs/project-architecture/_index.md` e .claude/skills/new-agent/SKILL.md\n```\ndocs/agent-feedback/session/\n```\n[l](../../../docs/ok-playbook/patterns/x.md)',
  );
});

test('D4: <project-root> em link fica intacto', () => {
  assert.equal(resolverPlaceholders('[l](<project-root>/x.md)', PADRAO, SKILL), '[l](<project-root>/x.md)');
});

test('D4: arquivo na raiz (CLAUDE.md) dá o mesmo resultado que sem destino', () => {
  const entrada = '[l](<playbook-root>patterns/x.md) [s](<playbook-root>agents/docs-review.md) [a](<arch-root>_index.md#z) e <backlog-root>';
  assert.equal(resolverPlaceholders(entrada, PADRAO, 'CLAUDE.md'), resolverPlaceholders(entrada, PADRAO));
  assert.equal(
    resolverPlaceholders(entrada, PADRAO, 'CLAUDE.md'),
    '[l](docs/ok-playbook/patterns/x.md) [s](.claude/skills/docs-review/SKILL.md) [a](docs/project-architecture/_index.md#z) e docs/agent-feedback/',
  );
});

test('D4: sem destino, link continua a partir da raiz (comportamento anterior)', () => {
  assert.equal(resolverPlaceholders('[l](<playbook-root>patterns/x.md)', PADRAO), '[l](docs/ok-playbook/patterns/x.md)');
});

test('D4: paths não padrão', () => {
  const paths = { ...PADRAO, docs: 'documentacao/', arch: 'documentacao/arq/' };
  assert.equal(
    resolverPlaceholders('[ds](<playbook-root>patterns/docs-structure.md)', paths, 'documentacao/arq/_index.md'),
    '[ds](../ok-playbook/patterns/docs-structure.md)',
  );
  assert.equal(
    resolverPlaceholders('[p](<playbook-root>patterns/x.md) [i](<arch-root>_index.md)', paths, SKILL),
    '[p](../../../documentacao/ok-playbook/patterns/x.md) [i](../../../documentacao/arq/_index.md)',
  );
  assert.equal(
    resolverPlaceholders('[t](<playbook-root>templates/z.md) <arch-root>', paths, 'documentacao/ok-playbook/patterns/y.md'),
    '[t](../templates/z.md) documentacao/arq/',
  );
});

test('D4: renderSkill repassa o destino', () => {
  const s = renderSkill('docs-review', '---\ndescription: "D"\n---\n\n[p](<playbook-root>patterns/x.md) <playbook-root>patterns/x.md\n', PADRAO, SKILL);
  assert.ok(s.includes('[p](../../../docs/ok-playbook/patterns/x.md) docs/ok-playbook/patterns/x.md'));
});

test('D4: link dentro de código inline ou bloco de código não é relativizado', () => {
  const entrada = '`[l](<playbook-root>patterns/x.md)`\n```md\n[l](<playbook-root>patterns/x.md)\n```\n[l](<playbook-root>patterns/x.md)';
  assert.equal(
    resolverPlaceholders(entrada, PADRAO, SKILL),
    '`[l](docs/ok-playbook/patterns/x.md)`\n```md\n[l](docs/ok-playbook/patterns/x.md)\n```\n[l](../../../docs/ok-playbook/patterns/x.md)',
  );
});
