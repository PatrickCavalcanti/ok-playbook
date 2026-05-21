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

### Agents

- [ ] `docs-review` (skill em `.claude/skills/docs-review/`)
- [ ] `new-agent` (skill em `.claude/skills/new-agent/`)

### Templates copiados

- [ ] `<backlog-root>/_template.md` (de `templates/feedback.md`)
- [ ] `<drafts-root>/_template.md` (de `templates/draft.md`)
- [ ] `<insights-root>/_template.md` (de `templates/insight.md`)
- [ ] `templates/ARCHITECTURE.md` (referenciado por `code-design.md §9`)

---

## Paths customizados

Mapeamento dos placeholders agnósticos do playbook para os paths reais deste projeto:

| Placeholder | Path neste projeto |
|---|---|
| `<backlog-root>` | `<BACKLOG_ROOT>` |
| `<drafts-root>` | `<DRAFTS_ROOT>` |
| `<insights-root>` | `<INSIGHTS_ROOT>` |
| `<docs-root>` | `<DOCS_ROOT>` |
| `<agents-root>` | `<AGENTS_ROOT>` |

---

## Mudanças no `CLAUDE.md`

- [ ] Bloco "ok-playbook" inserido (snippet de `install/claude-md-snippet.md`).
- [ ] Posicionado em: `<descrever onde no arquivo>`.

---

## Permissões adicionadas em `.claude/settings.json`

Listar o que foi adicionado:

```json
[
  "PowerShell(New-Item *)",
  "Bash(cmd //c \"mklink *\")",
  ...
]
```

Permissões de worktree (path-específicas) — status:

- [ ] Configuradas inline (substituí `<drive>` por `<X>` e `<project>` por `<Y>`).
- [ ] Não configuradas — vou rodar a skill `update-config` depois.

---

## Próximos passos manuais sugeridos

Coisas que o playbook *recomenda* mas que precisam de decisão humana:

- [ ] **Trio canônico de agentes:** se este projeto vai ter agentes de domínio próprios, crie-os via fluxo `<drafts-root> → new-agent` (ver `agent.md §6` e `agent.md §7`).
- [ ] **Permissões de worktree:** configure as 8 variantes de `cd <worktree> && *` para este path específico (ver `worktree.md §6.2`).
- [ ] **ARCHITECTURE.md por unidade:** se este projeto já tem módulos/powers/units, adicione `ARCHITECTURE.md` em cada um (ver `code-design.md §9`).
- [ ] **Índice de docs:** se o projeto tem um `_index.md`, adicione entradas referenciando o playbook (ver `claude-md-snippet.md`).

---

## O que NÃO foi instalado nesta instância

Listar componentes que o usuário optou por não instalar e o motivo (se dado):

- `<componente>`: <motivo, se houver>

---

## Histórico de upgrades

| Data | De | Para | Notas |
|---|---|---|---|
| YYYY-MM-DD | `<sha-anterior>` | `<sha-novo>` | <o que mudou> |

---

_Arquivo gerado por `packages/ok-playbook/INSTALL.md`. Para upgrade, peça ao Claude para "atualizar o ok-playbook"._
