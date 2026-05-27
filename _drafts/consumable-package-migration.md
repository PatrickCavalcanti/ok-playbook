---
status: draft
producer: user
target: ok-playbook (canon)
topic: migração de modelo vendored para pacote consumível
---

# Plano de migração — ok-playbook como dependência consumível

Hoje o ok-playbook é consumido em modo "vendored": instalar = copiar
patterns/skills/hooks/snippets pro consumidor. Isso impede update por
`pnpm up`, dilui a fronteira entre canon e cópia local, e força
`playbook-audit` a comparar conteúdo arquivo-a-arquivo.

Este draft descreve a migração pra um modelo onde o ok-playbook é uma
dependência real (npm ou git tag), o canon vive read-only em
`node_modules/`, e o consumidor mantém só um `ok-playbook.config.json`
+ um include estável no `CLAUDE.md`.

## Fase 0 — Pré-requisitos no canon (uma vez, no próprio ok-playbook)

- **Versionamento real**: sair de `0.0.0` / `private: true`, adotar SemVer
  e changelog. Definir contrato do que é breaking (mudança de path
  placeholder, remoção de pattern, rename de skill).
- **Definir superfície pública**: o que o pacote exporta (paths de
  patterns, skills, hooks, snippets) vs o que é interno. Hoje tudo é
  "público por acidente".
- **Definir formato do config do consumidor** (`ok-playbook.config.json`):
  paths, modo de contribuição, opt-outs de componentes, overrides de
  permissões.
- **Modo de distribuição**: npm (`@ok/playbook`) ou git tag pinado.
  Decidir antes de tudo — muda o resto.

## Fase 1 — Refatorar o canon pra ser lido em runtime

- **Remover placeholders de substituição** (`<backlog-root>` etc).
  Patterns e protocolos de agente passam a referenciar paths via lookup
  no config, não via string substituída no install.
- **Skills viram plugin namespaced** (`okplaybook:docs-review`,
  `okplaybook:new-agent`, etc.). Eliminar o passo de copiar pra
  `.claude/skills/`.
- **CLAUDE.md snippet vira include estável**: um arquivo no pacote
  (`install/claude-md-include.md`) que o consumidor referencia com
  `@node_modules/ok-playbook/install/claude-md-include.md`, não cola.
- **Hooks ficam no pacote**: `.claude/hooks/auto-approve-worktree-bash.js`
  no consumidor vira shim que chama `node_modules/ok-playbook/hooks/...`.
  Atualização do hook = `pnpm up`.
- **Permissões viram preset reutilizável**: pacote expõe
  `install/permissions-preset.json`; consumidor faz merge no
  `settings.json` (ou referencia via `extends`, se Claude Code suportar).

## Fase 2 — CLI mínimo do pacote

- `ok-playbook init` — cria `ok-playbook.config.json`, faz append do
  include no `CLAUDE.md`, faz merge do `permissions-preset`, cria as
  pastas de `<backlog-root>` etc. com os `_template.md`. Nada além disso.
- `ok-playbook doctor` — valida que o consumidor está consistente
  (config existe, include presente no `CLAUDE.md`, paths existem, versão
  suportada).
- `ok-playbook migrate <fromVersion>` — só pra breaking changes
  versionadas. Default no-op.

**Não fazer**: CLI que gera código de feature, scaffolds de módulo, etc.
Manter o pacote estritamente como "canon + adapter".

## Fase 3 — Reescrever playbook-audit e playbook-contribute

- **playbook-audit** vira diff de 2 superfícies só:
  `ok-playbook.config.json` e o include do `CLAUDE.md`. Drift de
  conteúdo de canon deixa de existir (canon é read-only em
  `node_modules/`).
- **playbook-contribute** muda semântica por modo:
  - `direct` (mantenedor): edita o repo do playbook, publica nova versão,
    consumidor faz `pnpm up`.
  - `branch-pr` / `request`: gera artefato (patch + insight) contra o
    repo upstream, sem tocar em `node_modules/`.
- Remover lógica de "editar `packages/ok-playbook/...` direto" — não
  existe mais no consumidor.

## Fase 4 — Documento de migração pra consumidor existente

Pensando em projetos que já usaram o modelo vendored (como este aqui):

- **Inventário**: o que foi copiado pro consumidor (skills, hooks,
  snippet, git-rules, templates).
- **Substituições**: cada cópia mapeia pra um mecanismo da nova versão
  (skill copiada → plugin namespaced; snippet colado → include; hook
  copiado → shim).
- **Reconciliação de customizações locais**: o que o consumidor editou
  pós-install precisa ser detectado e preservado (ou rejeitado
  explicitamente) antes de remover a cópia.
- **Cleanup**: remover `packages/ok-playbook/`, `.claude/skills/{docs-review,new-agent,...}`,
  `.claude/context/git-rules.md`, hook copiado. `OKPLAYBOOK.md` é
  regenerado num formato bem mais magro (versão + config +
  customizações, nada de "permissões adicionadas" / "componentes ativos"
  / "templates copiados" — tudo isso passa a ser derivável).

## Fase 5 — Validação com 2+ projetos piloto

Não promover a v1.0 do canon até existirem dois consumidores diferentes
funcionando com o novo modelo. Um só consumidor não exercita a hipótese
central ("canon read-only + adapter fino").

Cada piloto roda um ciclo completo: `init` → trabalho real por algumas
semanas → `pnpm up` pra uma versão menor → `pnpm up` pra uma versão
maior (breaking) com `migrate`.

## Decisões em aberto a resolver antes de codar

- npm público vs git tag privado (afeta CI, autenticação, escopo de uso).
- Skills como plugin do Claude Code: confirmar que o mecanismo suporta o
  que o playbook precisa (descoberta, namespacing, overrides locais).
- Onde mora `OKPLAYBOOK.md` na nova era: ainda faz sentido como
  manifesto, ou some em favor do `ok-playbook.config.json` +
  `pnpm list ok-playbook`?
- Compatibilidade Windows pros hooks (junctions, paths) — o modelo atual
  já cuida disso porque copia; com shim, precisa garantir que
  `node_modules/.bin/ok-playbook-hook` funciona via PowerShell sem
  fricção.
