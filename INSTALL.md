# Instalando o ok-playbook num projeto consumidor

## Caminho rápido (recomendado)

```bash
pnpm add git+ssh://git@github.com:PatrickCavalcanti/ok-playbook.git#v0.1.0
pnpm exec ok-playbook init
```

O `init` é idempotente — rode quantas vezes quiser. Faz:

1. Cria `ok-playbook.config.json` no root com paths default (`docs/`, `docs/agent-feedback/`, etc.).
2. Adiciona referência ao include do playbook no `CLAUDE.md` do projeto (preserva conteúdo existente).
3. Mescla permissões e hook de worktree em `.claude/settings.json`.
4. Scaffolda pastas de backlog, drafts, insights, superpowers, arquitetura — com templates.
5. Gera `OKPLAYBOOK.md` com manifesto da instalação.

Customizar paths: edite `ok-playbook.config.json` depois. Re-rodar `init` não sobrescreve.

## Atualizando

```bash
pnpm up ok-playbook
pnpm exec ok-playbook init   # re-roda; só atualiza o que mudou
```

## Modo de contribuição upstream

O `init` deixa `Modo de contribuição upstream: unknown` em `OKPLAYBOOK.md`. Quando você invocar o agente `playbook-contribute` pela primeira vez, ele pergunta e atualiza o manifesto. Se este é um consumidor externo sem git access ao playbook, escolha `request` (ou `unknown` — a feature de gerar issue upstream automaticamente ainda não existe; por enquanto a proposta é gerada como artefato local pra envio manual).

## O que ainda precisa ser feito manualmente (MVP 0.1.0)

Estas peças ainda exigem cópia manual no consumidor — virarão plugin/shim em versões futuras:

- **Skills do Claude Code** (`.claude/skills/<agent>/SKILL.md` pra `docs-review`, `new-agent`, `playbook-audit`, `permissions-review`, `playbook-contribute`). Crie cada uma apontando pro protocolo em `node_modules/ok-playbook/agents/<nome>.md`.
- **Hook de worktree** (`.claude/hooks/auto-approve-worktree-bash.js`): copie de `node_modules/ok-playbook/install/hooks/` e substitua o placeholder `<PROJECT_PATH>` pelo path do seu projeto em lowercase + forward-slash.
- **Profiles** (`.claude/profiles/dev-early.md`, `dev-stable.md`, `review.md`): extraia as seções de `node_modules/ok-playbook/patterns/profiles.md`.
- **Git rules** (`.claude/context/git-rules.md`): cópia de `node_modules/ok-playbook/patterns/git.md`.

Todos esses são project-level (nunca tocar em `~/.claude/`).
