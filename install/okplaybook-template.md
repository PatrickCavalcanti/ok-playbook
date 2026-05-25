# OKPLAYBOOK.md — Manifesto de Instalação

> Este arquivo é gerado pelo procedimento de instalação do `ok-playbook` (`packages/ok-playbook/INSTALL.md`). Registra o que foi instalado neste projeto, com qual versão, com quais customizações.
>
> **Re-gerado a cada upgrade.** Versões anteriores ficam em `OKPLAYBOOK.history/`.

---

## Versão

| Campo | Valor |
|---|---|
| Versão do playbook | `<commit-sha-do-submodulo-ou-tag>` |
| Data da instalação | `YYYY-MM-DD HH:MM` |
| Tipo | `install` ou `upgrade` |
| Instalado por | `<usuário ou agente>` |

---

## Componentes ativos

Marque o que foi instalado nesta instância:

### Patterns

- [ ] `code-design.md`
- [ ] `worktree.md`
- [ ] `feedback-loop.md`
- [ ] `agent.md`
- [ ] `subagent-dispatch.md`
- [ ] `git.md`
- [ ] `profiles.md`
- [ ] `permissions.md`
- [ ] `memory.md` (tipologia de memórias do projeto, refletida no `CLAUDE.md`)
- [ ] `superpowers-workflow.md` (roteamento Opus/Sonnet, cadência por fase, refletido no `CLAUDE.md`)
- [ ] `docs-structure.md` (hierarquia `<docs-root>` + `_index.md` da arquitetura + ciclo de specs/planos)

### Agents

- [ ] `docs-review` (skill em `.claude/skills/docs-review/`)
- [ ] `new-agent` (skill em `.claude/skills/new-agent/`)
- [ ] `playbook-audit` (skill em `.claude/skills/playbook-audit/`)
- [ ] `permissions-review` (skill em `.claude/skills/permissions-review/` — depende da skill built-in `fewer-permission-prompts`)
- [ ] `playbook-contribute` (skill em `.claude/skills/playbook-contribute/`)

### Templates copiados

- [ ] `<backlog-root>/_template.md` (de `templates/feedback.md`)
- [ ] `<drafts-root>/_template.md` (de `templates/draft.md`)
- [ ] `<insights-root>/_template.md` (de `templates/insight.md`)
- [ ] `<arch-root>/_index.md` (de `templates/_index.template.md` — adaptar `<NOME-DO-PROJETO>` e dimensões)
- [ ] `<arch-root>/templates/ARCHITECTURE.template.md` (de `templates/ARCHITECTURE.md`, referenciado por `code-design.md §9`)

---

## Paths customizados

Mapeamento dos placeholders agnósticos do playbook para os paths reais deste projeto:

| Placeholder | Path neste projeto |
|---|---|
| `<docs-root>` | `<DOCS_ROOT>` |
| `<arch-root>` | `<ARCH_ROOT>` |
| `<agents-root>` | `<AGENTS_ROOT>` |
| `<superpowers-root>` | `<SUPERPOWERS_ROOT>` |
| `<backlog-root>` | `<BACKLOG_ROOT>` |
| `<drafts-root>` | `<DRAFTS_ROOT>` |
| `<insights-root>` | `<INSIGHTS_ROOT>` |

---

## Modo de contribuição upstream

Como este projeto contribui de volta pro `ok-playbook` quando descobre algo genérico que vale virar canon. Lido pelo agente [`playbook-contribute`](packages/ok-playbook/agents/playbook-contribute.md):

| Campo | Valor |
|---|---|
| Modo | `direct` / `branch-pr` / `request` / `unknown` |
| Canal de envio (apenas `request`) | `<como o consumidor envia a proposta ao mantenedor — email, Slack, issue, etc.>` |
| URL do repo upstream | `<git url do ok-playbook canônico>` |
| Branch alvo (apenas `branch-pr`) | `main` (default) ou outro |

**Definição dos modos:**

- **`direct`** — push direto na main do playbook. Mantenedor / projetos pessoais.
- **`branch-pr`** — git access, mas mudanças vão por branch + merge request. Default pra times.
- **`request`** — sem git access ao playbook; mudanças viram artefato em `<insights-root>/upstream-proposals/` pra mantenedor aplicar manualmente.
- **`unknown`** — não definido; `playbook-contribute` pergunta na primeira invocação.

---

## Mudanças no `CLAUDE.md`

- [ ] Bloco "ok-playbook" inserido (snippet de `install/claude-md-snippet.md`).
- [ ] Posicionado em: `<descrever onde no arquivo>`.

---

## Permissões adicionadas em `.claude/settings.json`

Listar o que foi adicionado em `permissions.allow`:

```json
[
  "PowerShell(New-Item *)",
  "Bash(cmd //c \"mklink *\")",
  ...
]
```

## Hook de worktree (PreToolUse)

Substitui a abordagem obsoleta de 8+ regras `Bash(cd <path> && *)` por um único script Node.js. Ver [`packages/ok-playbook/patterns/worktree.md §6`](packages/ok-playbook/patterns/worktree.md) pro rationale.

| Campo | Valor |
|---|---|
| Status | `instalado` / `não instalado (projeto sem worktrees)` / `pendente` |
| `<PROJECT_PATH>` usado na parametrização | `<lowercase/forward-slash path do projeto>` |
| Script copiado em | `.claude/hooks/auto-approve-worktree-bash.js` |
| Bloco `hooks.PreToolUse` em `settings.json` | `instalado` / `não instalado` |
| Whitelist customizado em relação ao template? | `não` / `sim — comandos adicionais: [<lista>]` |

---

## Próximos passos manuais sugeridos

Coisas que o playbook *recomenda* mas que precisam de decisão humana:

- [ ] **Trio canônico de agentes:** se este projeto vai ter agentes de domínio próprios, crie-os via fluxo `<drafts-root> → new-agent` (ver `agent.md §6` e `agent.md §7`).
- [ ] **Permissões de worktree:** configure as 8 variantes de `cd <worktree> && *` para este path específico (ver `worktree.md §6.2`).
- [ ] **ARCHITECTURE.md por unidade:** se este projeto já tem módulos/powers/units, adicione `ARCHITECTURE.md` em cada um (ver `code-design.md §9`).
- [ ] **Índice de docs:** se o projeto tem um `_index.md`, adicione entradas referenciando o playbook (ver `claude-md-snippet.md`).
- [ ] **Revalidação periódica:** ao bumpar a versão do submódulo (`git submodule update --remote packages/ok-playbook`), peça "revalida o ok-playbook" para rodar `playbook-audit` — não rode `INSTALL.md` de novo.

---

## O que NÃO foi instalado nesta instância

Listar componentes que o usuário optou por não instalar e o motivo (se dado):

- `<componente>`: <motivo, se houver>

---

## Customizações locais ignoradas no drift report

Arquivos que vieram do playbook mas o projeto editou intencionalmente. O `playbook-audit` lista essas divergências como nota informativa, **não** como decisão pendente. Para remover uma entrada daqui, o usuário tem que apagar manualmente — agentes nunca modificam esta seção sem ordem direta.

| Path local | Origem no playbook | Razão da customização | Marcado em |
|---|---|---|---|
| `<path>` | `<path-no-playbook>` | `<razão curta>` | `YYYY-MM-DD` |

---

## Histórico de upgrades / auditorias

| Data | De (SHA) | Para (SHA) | Tipo | Notas |
|---|---|---|---|---|
| YYYY-MM-DD | `<sha-anterior>` | `<sha-novo>` | `install` / `audit` | <o que mudou ou foi decidido> |

---

_Arquivo gerado por `packages/ok-playbook/INSTALL.md`; revalidado por `packages/ok-playbook/agents/playbook-audit.md`. Para upgrade, peça ao Claude para **"revalida o ok-playbook"** (rodar `INSTALL.md` de novo só em reinstalação completa)._
