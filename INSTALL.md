# Instalando o ok-playbook num projeto consumidor

## Caminho rápido (recomendado)

```bash
pnpm add git+ssh://git@github.com:PatrickCavalcanti/ok-playbook.git#v0.2.1
pnpm exec ok-playbook init
```

> Use sempre a última tag publicada (hoje `v0.2.1`) — confira em [tags](https://github.com/PatrickCavalcanti/ok-playbook/tags).

O `init` é idempotente — rode quantas vezes quiser. Faz:

1. Cria `ok-playbook.config.json` no root com paths default (`docs/`, `docs/agent-feedback/`, etc.).
2. Adiciona referência ao include do playbook no `CLAUDE.md` do projeto (preserva conteúdo existente).
3. Mescla permissões e hook de worktree em `.claude/settings.json`.
4. Scaffolda pastas de backlog, drafts, insights, superpowers, arquitetura — com templates.
5. Gera `OKPLAYBOOK.md` com manifesto da instalação.

Customizar paths: edite `ok-playbook.config.json` depois. Re-rodar `init` não sobrescreve.

## Atualizando

A dependência é pinada numa tag git, então `pnpm up` **não cruza versões** (a tag é fixa). Para subir de uma versão antiga para a nova, troque a tag e re-rode o `init`:

```bash
pnpm add git+ssh://git@github.com:PatrickCavalcanti/ok-playbook.git#v0.2.1  # nova tag
pnpm exec ok-playbook init   # re-roda; idempotente, só atualiza o que mudou
```

Depois, **verifique o drift** contra o canon novo: peça "**revalida o ok-playbook**" para invocar o agente `playbook-audit` (ver [`agents/playbook-audit.md`](agents/playbook-audit.md)).

## Modo de contribuição upstream

O `init` deixa `Modo de contribuição upstream: unknown` em `OKPLAYBOOK.md`. Quando você invocar o agente `playbook-contribute` pela primeira vez, ele pergunta e atualiza o manifesto. Se este é um consumidor externo sem git access ao playbook, escolha `request` (ou `unknown` — a feature de gerar issue upstream automaticamente ainda não existe; por enquanto a proposta é gerada como artefato local pra envio manual).

## O que ainda precisa ser feito manualmente (MVP 0.1.0)

Estas peças ainda exigem cópia manual no consumidor — virarão plugin/shim em versões futuras:

- **Skills do Claude Code** (`.claude/skills/<agent>/SKILL.md` pra `docs-review`, `new-agent`, `playbook-audit`, `permissions-review`, `playbook-contribute`). Crie cada uma apontando pro protocolo em `node_modules/ok-playbook/agents/<nome>.md`.
- **Hook de worktree** (`.claude/hooks/auto-approve-worktree-bash.js`): copie de `node_modules/ok-playbook/install/hooks/` e substitua o placeholder `<PROJECT_PATH>` pelo path do seu projeto em lowercase + forward-slash. **Customize a `WHITELIST`** com os bins reais do projeto (ex.: `ok-bridge`/`drizzle-kit` se usa ok-data-bridge; `vite`/`vitest` se usa Vite — vários já vêm no default).
- **Profiles** (`.claude/profiles/dev-early.md`, `dev-stable.md`, `review.md`): extraia as seções de `node_modules/ok-playbook/patterns/profiles.md`.
- **Git rules** (`.claude/context/git-rules.md`): cópia de `node_modules/ok-playbook/patterns/git.md`.

Todos esses são project-level (nunca tocar em `~/.claude/`).

## Decisão de instalação: tipo de projeto + estratégia de worktree

Antes de usar worktrees neste projeto, decida (e registre em `OKPLAYBOOK.md`):

1. **É monorepo?** Critério objetivo: `pnpm-workspace.yaml` tem `packages:` com libs locais não-compiladas, OU `package.json` tem `workspaces` com packages locais. Senão → **single-package**.
2. **Estratégia de worktree** (ver [`patterns/worktree.md §5.2`](patterns/worktree.md)):
   - **pnpm** (qualquer projeto) ou **single-package** → **Strategy B (install real na worktree)**. NÃO use junction com pnpm (`verify-deps-before-run` tenta purgar o node_modules e pode corromper a main).
   - **Monorepo npm/yarn** com libs locais não-compiladas → **Strategy A (junction)**, com path absoluto.

> **Nota:** hoje essa decisão é manual. Detecção automática de monorepo + recomendação de estratégia no `ok-playbook init` é enhancement planejado (ver CHANGELOG). Por ora, o `init` não pergunta — o instalador decide com o critério acima.
