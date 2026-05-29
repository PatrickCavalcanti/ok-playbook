#!/usr/bin/env node
/**
 * Template canônico do ok-playbook: PreToolUse hook que auto-aprova Bash calls
 * da forma `cd <path-do-projeto>/.worktrees/<name>[/...] [&& <whitelisted-cmd> ...]`.
 *
 * Substitui ~100 regras compound verbosas em `.claude/settings.json` (uma por
 * variante de quoting × comando interno) por uma única decisão programática.
 * Tudo que não casar o padrão cai no permission system normal — não bloqueia.
 *
 * PARAMETRIZAÇÃO NA INSTALAÇÃO:
 *   - Substituir <PROJECT_PATH> abaixo pelo path do projeto a partir do drive,
 *     em LOWERCASE com FORWARD SLASHES. Ex:
 *       e:/Projetos/MyApp  →  PROJECT_PATH = "projetos/myapp"
 *       d:/code/foo-bar    →  PROJECT_PATH = "code/foo-bar"
 *
 * MANUTENÇÃO:
 *   - Editar `WHITELIST` abaixo pra adicionar/remover comandos liberados.
 *   - Hooks recarregam ao vivo (sem precisar reload window) — diferente de rules.
 *
 * SEGURANÇA:
 *   - Hook auto-aprova qualquer chain `&&` cujos heads estejam no whitelist.
 *   - NÃO adicione ao whitelist comandos de alto risco (curl, npm install -g,
 *     git push, git reset --hard) — ver patterns/worktree.md §6.4.
 *   - Hook NÃO checa operadores além de `&&` (`;`, `|`, `||`). Se subagente
 *     for comprometido, esses são vetores. Mitigação: nunca rodar subagente
 *     não-confiável em projeto importante.
 *
 * REFERÊNCIA:
 *   - patterns/worktree.md §6.2 (uso canônico)
 *   - patterns/permissions.md §"Quando rules não bastam" (rationale)
 *   - Doc oficial Claude Code hooks: https://code.claude.com/docs/en/hooks
 */

const PROJECT_PATH = '<PROJECT_PATH>'; // ex: 'projetos/igris'

const WHITELIST = new Set([
  'git',
  'node', 'npm', 'pnpm', 'npx', 'tsx', 'tsc',
  // build/test/lint/migration toolchain comum (Vite + ok-data-bridge):
  'vitest', 'vite', 'eslint', 'prettier', 'ok-bridge', 'drizzle-kit',
  'ls', 'cat', 'find', 'grep', 'head', 'sed', 'wc', 'pwd',
  'mkdir', 'cp', 'mv', 'rm', 'touch', 'echo',
]);

/**
 * Extrai o nome-base do comando: tira o caminho (`node_modules/.bin/vitest` →
 * `vitest`), a extensão (`.cmd`/`.exe`/`.bin`/`.ps1`) e normaliza pra lowercase.
 * NECESSÁRIO: na estratégia de install-no-worktree (default pnpm), e mesmo via
 * junction, o tooling é invocado como `node_modules/.bin/<bin>` (porque
 * `pnpm exec` quebra em worktree). Sem o basename, esses comandos não casariam
 * a whitelist e gerariam prompt a cada chamada.
 */
function commandBasename(head) {
  return head
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/\.(cmd|exe|bin|ps1)$/i, '')
    .toLowerCase();
}

let raw = '';
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }

  const cmd = data && data.tool_input && data.tool_input.command;
  if (!cmd || typeof cmd !== 'string') process.exit(0);

  const norm = cmd.toLowerCase().replace(/\\/g, '/');
  const pattern = new RegExp(`^cd\\s+.*${PROJECT_PATH.toLowerCase()}/\\.worktrees/`);
  if (!pattern.test(norm)) process.exit(0);

  const segments = cmd.split(/\s+&&\s+/);
  for (let i = 1; i < segments.length; i++) {
    const head = commandBasename(segments[i].trim().split(/\s+/)[0]);
    if (!WHITELIST.has(head)) process.exit(0);
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: 'Auto-approved: cd into project worktree + whitelisted command chain',
    },
  }));
  process.exit(0);
});
