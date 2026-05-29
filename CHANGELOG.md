# Changelog

## 0.2.0 (2026-05-29)

Correções de worktree/permissões a partir de fricções reais em projetos consumidores (pnpm + junction, Windows). (Plugin/shim de skills/profiles permanece fora deste release — segue como trabalho futuro.)

### Mudanças
- **`patterns/worktree.md` §5.2 — estratégia de dependências por gerenciador/tipo de projeto.** Strategy B (install real) passa a ser o **default para pnpm e para single-package**; Strategy A (junction) fica reservada a monorepo npm/yarn com libs locais não-compiladas. Documentado que **pnpm + junction não funciona e é perigoso** (`verify-deps-before-run` tenta purgar o node_modules; pode corromper o checkout principal).
- **`patterns/worktree.md` §5.3/§9/§11** — pegadinhas novas (pnpm purge; mklink relativo frágil → usar path absoluto), ordem segura de cleanup no Windows (remover junction com `rmdir` antes de `git worktree remove`; nunca `rm -rf` sobre junction), e checklist de estratégia por gerenciador.
- **`install/hooks/auto-approve-worktree-bash.js`** — adicionada a função `commandBasename()` (faz `node_modules/.bin/<bin>` casar a whitelist — essencial porque `pnpm exec` quebra em worktree) e a whitelist default ganhou `vitest, vite, eslint, prettier, ok-bridge, drizzle-kit`.
- **`agents/permissions-review.md`** — escopo ampliado: reconhece a whitelist do hook de worktree como alvo de modificação quando os prompts vêm de dentro de `.worktrees/` (compounds `cd && cmd` não casam em `permissions.allow`).
- **`patterns/feedback-loop.md` §8.6/§10** — roteamento obrigatório: feedback cujo alvo é doc do PLAYBOOK vai pra `playbook-contribute` (não editar o canon read-only localmente) e fica pendente até subir upstream; encerramento lista pendências antigas por nome (anti-evaporação).
- **`INSTALL.md`** — passo de decisão "tipo de projeto + estratégia de worktree" + customização da whitelist do hook por projeto.

### Conhecido (próximos)
- Detecção automática de monorepo + recomendação de estratégia de worktree no `ok-playbook init` (hoje a decisão é manual via INSTALL.md). Requer design de interatividade (init é não-interativo no 0.1.x).

## 0.1.0 (2026-05-27)

MVP "consumível" do ok-playbook.

### Mudanças
- Pacote agora é instalável via git tag (`pnpm add git+ssh://...ok-playbook#v0.1.0`).
- CLI `ok-playbook init` substitui o protocolo manual de `INSTALL.md`.
- Include estável em `install/claude-md-include.md` referenciado via `@node_modules/ok-playbook/...`; placeholders não são mais substituídos no install, são resolvidos em runtime via `ok-playbook.config.json`.
- Init não pergunta modo de contribuição. `playbook-contribute` continua perguntando quando invocado com `contribution: unknown`.

### Conhecido (out of scope para 0.1.0)
- Skills, hooks, profiles, `git-rules.md` ainda precisam de cópia manual no consumidor — virarão plugin/shim em 0.2.
- `ok-playbook doctor`/`migrate` ainda não existem.
- Modo `external` de contribuição (gerar issue upstream) ainda não implementado.
