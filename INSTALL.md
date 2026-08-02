# Instalando o ok-playbook num projeto consumidor

## Caminho rápido (recomendado)

```bash
pnpm add git+https://github.com/PatrickCavalcanti/ok-playbook.git#v0.3.0
pnpm exec ok-playbook init
```

> Use sempre a última tag publicada (hoje `v0.3.0`) — confira em [tags](https://github.com/PatrickCavalcanti/ok-playbook/tags).

O `init` é idempotente — rode quantas vezes quiser. Faz:

1. Cria `ok-playbook.config.json` no root com paths default (`docs/`, `docs/agent-feedback/`, etc.).
2. Adiciona referência ao include do playbook no `CLAUDE.md` do projeto (preserva conteúdo existente).
3. Mescla permissões e hook de worktree em `.claude/settings.json`.
4. Scaffolda pastas de backlog, drafts, insights, superpowers, arquitetura — com templates.
5. Gera `OKPLAYBOOK.md` com manifesto da instalação.

Customizar paths: edite `ok-playbook.config.json` depois. Re-rodar `init` não sobrescreve.

## Atualizando a versão

### HTTPS, não SSH

A forma canônica é **`git+https://`**. O Git Credential Manager do Windows já está autenticado para os repos da conta, então HTTPS funciona sem setup nenhum — enquanto SSH exige chave gerada e registrada.

```bash
pnpm add git+https://github.com/PatrickCavalcanti/ok-playbook.git#v0.3.0
```

> ⚠️ Versões anteriores deste doc traziam `git+ssh://git@github.com:PatrickCavalcanti/…` — que além de exigir chave, é **URL malformada**: com o esquema `git+ssh://` o separador tem que ser `/`, não `:` (o `:` é forma scp-style, que só vale *sem* o esquema). Se você tentou instalar por esse comando e falhou, era isso.
>
> SSH (`git+ssh://git@github.com/PatrickCavalcanti/ok-playbook.git#v0.3.0`, com barra) continua válido para máquina com chave configurada. Em **CI** nenhuma das duas serve sozinha: repo privado exige um fine-grained PAT com leitura, exposto como secret.

### O procedimento

`pnpm up` **não sobe a versão** — a dependência está pinada numa tag, e tag é fixa. Atualizar é trocar a tag:

```bash
pnpm add git+https://github.com/PatrickCavalcanti/ok-playbook.git#<nova-tag>
pnpm exec ok-playbook init    # idempotente; só mexe no que mudou
```

### O que o `init` NÃO atualiza

Isto é o que deixa projeto silenciosamente desatualizado. O `init` mescla config, permissões e scaffolds — mas as peças da seção "O que ainda precisa ser feito manualmente" são **cópias**, e cópia não se atualiza sozinha:

- `.claude/hooks/` — hooks, `lib/` e `tools/`. **Recopie de `node_modules/ok-playbook/install/hooks/`** e reaplique a parametrização (`PROJETO`, `SCRATCH`, `LEITURA`, whitelists). Depois rode `hook-test.mjs` e `hook-test-powershell.mjs`.
- `.claude/skills/<agent>/SKILL.md`
- `.claude/profiles/*.md` e `.claude/context/git-rules.md`

Sintoma clássico de ter pulado esse passo: `OKPLAYBOOK.md` diz uma versão nova, mas o comportamento é o da antiga.

### Ordem quando há vários consumidores

**Atualize todos, depois audite.** Rodar `playbook-audit` com metade dos projetos numa versão e metade em outra produz um relatório de drift que mistura "está desatualizado" com "divergiu de propósito" — e o ruído torna o resultado inútil.

Por projeto:

1. `pnpm add …#<nova-tag>` + `pnpm exec ok-playbook init`
2. Recopiar as peças manuais acima (hooks em especial) e reaplicar a parametrização
3. Rodar as suites do hook
4. Atualizar a versão em `OKPLAYBOOK.md`

Só quando todos estiverem na mesma tag, peça "**revalida o ok-playbook**" em cada um — invoca o agente `playbook-audit` (ver [`agents/playbook-audit.md`](agents/playbook-audit.md)), que aí compara contra um canon único.

## Modo de contribuição upstream

O `init` deixa `Modo de contribuição upstream: unknown` em `OKPLAYBOOK.md`. Quando você invocar o agente `playbook-contribute` pela primeira vez, ele pergunta e atualiza o manifesto. Se este é um consumidor externo sem git access ao playbook, escolha `request` (ou `unknown` — a feature de gerar issue upstream automaticamente ainda não existe; por enquanto a proposta é gerada como artefato local pra envio manual).

## O que ainda precisa ser feito manualmente (MVP 0.1.0)

Estas peças ainda exigem cópia manual no consumidor — virarão plugin/shim em versões futuras:

- **Skills do Claude Code** (`.claude/skills/<agent>/SKILL.md` pra `docs-review`, `new-agent`, `playbook-audit`, `permissions-review`, `playbook-contribute`). Crie cada uma apontando pro protocolo em `node_modules/ok-playbook/agents/<nome>.md`.
- **Hooks de permissões** (`.claude/hooks/` inteiro: `auto-approve-project-bash.mjs`, `auto-approve-project-powershell.mjs`, `lib/areas.mjs` e `tools/`): copie de `node_modules/ok-playbook/install/hooks/`. Em máquina Windows registre **os dois matchers** (`Bash` e `PowerShell`) — a tool PowerShell responde por ~17% das chamadas e sofre a mesma quebra de matching. A política é única (`lib/areas.mjs`); só o parser é por shell. Os arquivos são `.mjs` de propósito: ESM independente do `type` do `package.json`. **Não configure no chute — rode o roteiro de 5 passos de [`patterns/permissions.md §Roteiro de diagnóstico`](patterns/permissions.md):** `medir-comandos.mjs` diz quais heads e quais áreas o projeto usa de verdade, e `hook-replay.mjs` mede a cobertura antes/depois. Ajuste `PROJETO` (path absoluto, lowercase, forward slashes, **com drive**), `SCRATCH` e `LEITURA`, e os whitelists com o que a medição mostrou.
  - Projeto que já tem o hook antigo `auto-approve-worktree-bash.js`: substitua e **remova o registro antigo** de `settings.json` (ele cobre só `.worktrees/`, ~9-17% das chamadas).
  - Acrescente também o bloco `permissions.deny` — é ele, e não a ausência de `allow`, que impede `git push --force` e afins.
- **Script de worktree** (`scripts/worktree.mjs`): copie de `node_modules/ok-playbook/install/scripts/`. Se o projeto tem estratégia de deps própria (monorepo com junction seletivo, por exemplo), crie `worktree.config.mjs` no root apontando pra ela — ver cabeçalho do script. Atalhos sugeridos no `package.json`: `"wt:new"` e `"wt:close"`.
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
