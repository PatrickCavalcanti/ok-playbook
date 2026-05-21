# Snippet para CLAUDE.md do projeto consumidor

> **Para o agente instalador:** este é o snippet a inserir no `CLAUDE.md` do projeto consumidor (§4 de `INSTALL.md`). Substitua os placeholders entre `<>` pelos paths reais definidos em §2 da instalação.

---

```markdown
## ok-playbook (padrões de desenvolvimento)

Este projeto consome o `ok-playbook` em `packages/ok-playbook/`. **Leia antes de qualquer trabalho de arquitetura, agentes ou subagentes:**

- **Patterns (princípios agnósticos):** [`packages/ok-playbook/patterns/`](packages/ok-playbook/patterns/)
  - [`code-design.md`](packages/ok-playbook/patterns/code-design.md) — 5 camadas, naming, ponto de contato, fractal, ARCHITECTURE.md
  - [`worktree.md`](packages/ok-playbook/patterns/worktree.md) — quando criar worktree, permissões do Claude Code
  - [`feedback-loop.md`](packages/ok-playbook/patterns/feedback-loop.md) — produtor → backlog → processador → atualização
  - [`agent.md`](packages/ok-playbook/patterns/agent.md) — quando criar agente, anatomia, trio canônico
  - [`subagent-dispatch.md`](packages/ok-playbook/patterns/subagent-dispatch.md) — política de modelos, granularidade, isolamento

- **Agents agnósticos:** [`packages/ok-playbook/agents/`](packages/ok-playbook/agents/) — `docs-review`, `new-agent`
- **Templates:** [`packages/ok-playbook/templates/`](packages/ok-playbook/templates/) — feedback, draft, insight, ARCHITECTURE

### Paths deste projeto

| Placeholder do playbook | Path neste projeto |
|---|---|
| `<backlog-root>` | `<BACKLOG_ROOT>` |
| `<drafts-root>` | `<DRAFTS_ROOT>` |
| `<insights-root>` | `<INSIGHTS_ROOT>` |
| `<docs-root>` | `<DOCS_ROOT>` |
| `<agents-root>` | `<AGENTS_ROOT>` |

### Regras invariantes vindas do playbook

- Todo agente abre arquivo de feedback como primeira ação (ver `feedback-loop.md §6` e `agent.md §4.2`).
- Status `pending-review` só o processador (`docs-review`) muda.
- Subagentes não instalam deps, não tomam decisão arquitetural, não despacham outros subagentes (`subagent-dispatch.md §7`).
- Política de modelos para subagentes: implementer/spec=Sonnet, code-quality/final=Opus (`subagent-dispatch.md §4`).

Manifesto de instalação: [`OKPLAYBOOK.md`](OKPLAYBOOK.md) no root do projeto.
```
