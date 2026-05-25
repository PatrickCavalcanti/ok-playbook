# Snippet para CLAUDE.md do projeto consumidor

> **Para o agente instalador:** este é o snippet a inserir no `CLAUDE.md` do projeto consumidor (§4 de `INSTALL.md`). Substitua os placeholders entre `<>` pelos paths reais definidos em §2 da instalação.

---

```markdown
## Antes de começar

Qual o modo de operação desta sessão? **dev-early**, **dev-stable** ou **review**.

Responda com o número ou nome. Se não responder, assumir **dev-early**.

Detalhes: [`packages/ok-playbook/patterns/profiles.md`](packages/ok-playbook/patterns/profiles.md). Regras git: [`packages/ok-playbook/patterns/git.md`](packages/ok-playbook/patterns/git.md). Permissões: [`packages/ok-playbook/patterns/permissions.md`](packages/ok-playbook/patterns/permissions.md).

---

## ok-playbook (padrões de desenvolvimento)

Este projeto consome o `ok-playbook` em `packages/ok-playbook/`. **Leia antes de qualquer trabalho de arquitetura, agentes ou subagentes:**

- **Patterns (princípios agnósticos):** [`packages/ok-playbook/patterns/`](packages/ok-playbook/patterns/)
  - [`code-design.md`](packages/ok-playbook/patterns/code-design.md) — 5 camadas, naming, ponto de contato, fractal, ARCHITECTURE.md
  - [`worktree.md`](packages/ok-playbook/patterns/worktree.md) — quando criar worktree, permissões do Claude Code
  - [`feedback-loop.md`](packages/ok-playbook/patterns/feedback-loop.md) — produtor → backlog → processador → atualização
  - [`agent.md`](packages/ok-playbook/patterns/agent.md) — quando criar agente, anatomia, trio canônico
  - [`subagent-dispatch.md`](packages/ok-playbook/patterns/subagent-dispatch.md) — política de modelos, granularidade, isolamento
  - [`git.md`](packages/ok-playbook/patterns/git.md) — convenções de branches, commits, bloqueados
  - [`profiles.md`](packages/ok-playbook/patterns/profiles.md) — modos de operação canônicos
  - [`permissions.md`](packages/ok-playbook/patterns/permissions.md) — filosofia de `.claude/settings.json`
  - [`memory.md`](packages/ok-playbook/patterns/memory.md) — **user-level**, configurado em `~/.claude/CLAUDE.md`
  - [`superpowers-workflow.md`](packages/ok-playbook/patterns/superpowers-workflow.md) — **user-level**, configurado em `~/.claude/CLAUDE.md`

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

### Registro de feedback de sessão

Toda sessão neste projeto registra fricções de forma estruturada, seguindo o padrão de [`packages/ok-playbook/patterns/feedback-loop.md`](packages/ok-playbook/patterns/feedback-loop.md).

**Gatilho (lazy):** o arquivo de feedback é criado **somente no primeiro feedback registrado** — não no boot da sessão. Sessão sem fricção real não gera arquivo.

**Quando registrar:**
- Documentação ambígua, faltando, ou que conduziu a erro.
- Correção do usuário ao rumo da sessão.
- Padrão ou convenção do projeto que não funcionou como descrito.
- Sugestão concreta de mudança em docs ou regras.

**Onde:** `<BACKLOG_ROOT>/session/YYYY-MM-DD_HHmm.md`, criado a partir de `<BACKLOG_ROOT>/_template.md` (campo `producer: session`).

**Como:** anotar uma linha no momento da fricção (parar 30s, anotar, continuar). Não acumular pra anotar no fim.

**O que NÃO é feedback aqui:**
- Bugs de código (vão pra tracker do projeto ou logs de sessão).
- Tarefas em aberto da sessão (vão pra TodoWrite).
- Decisões válidas de design (vão pra spec/plan).

**Encerramento da sessão:** se o arquivo foi criado, oferecer invocar `docs-review` para processar. Se não foi (sessão sem fricção), citar apenas a contagem de pendentes anteriores.

Manifesto de instalação: [`OKPLAYBOOK.md`](OKPLAYBOOK.md) no root do projeto.
```
