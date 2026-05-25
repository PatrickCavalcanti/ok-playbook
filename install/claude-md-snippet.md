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
  - [`memory.md`](packages/ok-playbook/patterns/memory.md) — tipologia de memórias persistentes do projeto
  - [`superpowers-workflow.md`](packages/ok-playbook/patterns/superpowers-workflow.md) — workflow superpowers + roteamento Opus/Sonnet

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
- Política de modelos para subagentes: implementer/spec=Sonnet, code-quality/final=Opus (ver bloco "Workflow superpowers" abaixo).

### Memórias persistentes deste projeto

Tipologia canônica (detalhes em [`packages/ok-playbook/patterns/memory.md`](packages/ok-playbook/patterns/memory.md)):

| Tipo | Quando salvar |
|---|---|
| `user` | Papel, preferências, conhecimento do usuário |
| `feedback` | Correção do usuário ou approach não-óbvio validado (sempre com **Why:** + **How to apply:**) |
| `project` | Decisões/iniciativas/contexto que não está no código ou git |
| `reference` | Ponteiros pra sistemas externos (Linear, dashboards, canais) |

Estrutura: `MEMORY.md` é índice (1 linha por memória, ~150 chars). Memórias individuais têm frontmatter com `name`, `description`, `metadata.type`. Linkar com `[[name]]`.

**NÃO salvar:** code patterns, arquitetura, file paths, git history, debugging recipes, conteúdo já em CLAUDE.md, estado efêmero de task.

Anti-pattern: "salva esta lista de PRs". Resposta correta: perguntar o que foi *surpreendente* ou *não-óbvio*.

### Workflow superpowers — roteamento de modelos

Fluxo: `brainstorming` → `writing-plans` → `subagent-driven-development` (ou `executing-plans` em sessão separada). Detalhes em [`packages/ok-playbook/patterns/superpowers-workflow.md`](packages/ok-playbook/patterns/superpowers-workflow.md).

Roteamento fixo de modelos (não avaliar complexidade da task):

| Papel | Model |
|---|---|
| Sessão principal (brainstorm + plan) | Opus |
| Implementer (subagente que executa tarefas) | Sonnet |
| Spec reviewer (subagente) | Sonnet |
| Code quality reviewer (subagente) | Opus |
| Final code reviewer (subagente) | Opus |

Substitui a seção "Model Selection" do skill `subagent-driven-development` que usa linguagem vaga ("most capable", "fast cheap").

**Cadência de testes e reviews:** default do skill é a cada task; política da OK é **só ao final de cada fase** (`## Fase N — <nome>`; sem fases = plano inteiro como 1 fase). Implementer ainda commita por task. Final code review do plano inteiro continua.

**Não aplicar quando:** usuário pede review por task explícito; task crítica marcada (🚨); plano sem fases com menos de 5 tasks.

**Paralelismo:** sempre oferecer paralelismo quando o plano permitir. Classificar tasks como sequenciais (dependência de output) vs paralelas (arquivos disjuntos). Apresentar dispatch plan e pedir OK antes da fase. Skill: `superpowers:dispatching-parallel-agents`. Em dúvida, sequencializar.

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

### Registro de prompts de permissão

Prompts de permissão repetidos durante a sessão (mesmo comando travando o agente mais de uma vez) são uma fricção tratável — viram allowlist em `.claude/settings.json` em vez de continuar interrompendo o trabalho.

**Gatilho (lazy):** ao encerrar a sessão, **se** houve prompts de permissão repetidos (mesmo pattern travou 2+ vezes), oferecer invocar `permissions-review`:

> "Notei N prompts de permissão repetidos nesta sessão. Quer que eu rode `permissions-review` pra propor entradas generalizadas no allowlist?"

Sem prompts repetidos, **não disparar nada** — não comentar, não perguntar.

**O que `permissions-review` faz:** delega o escaneamento à skill built-in `fewer-permission-prompts`, aplica o filtro de generalização de [`packages/ok-playbook/patterns/permissions.md`](packages/ok-playbook/patterns/permissions.md), mostra diff e aplica em `settings.json` (ou `settings.local.json`) só com OK do usuário. Detalhes em [`packages/ok-playbook/agents/permissions-review.md`](packages/ok-playbook/agents/permissions-review.md).

Também pode ser invocado manualmente ("revisa permissões da sessão").

Manifesto de instalação: [`OKPLAYBOOK.md`](OKPLAYBOOK.md) no root do projeto.
```
