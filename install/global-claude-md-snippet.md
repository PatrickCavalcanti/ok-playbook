# Snippet para `~/.claude/CLAUDE.md` global do usuário

> **Para o agente instalador:** este snippet vai em `~/.claude/CLAUDE.md` do usuário (não em `CLAUDE.md` do projeto). Aplicar via INSTALL.md §7 com diff explícito e confirmação. Afeta TODOS os projetos do usuário.

---

```markdown
## ok-playbook (user-level)

Padrões da OK que valem em **todos** os projetos que adotam o ok-playbook. Atualizações concretas: pacote `ok-playbook` instalado em cada projeto consumidor (caminho varia, geralmente `packages/ok-playbook/`).

### Memórias

Tipologia canônica de memórias persistentes:

| Tipo | Quando salvar |
|---|---|
| `user` | Papel, preferências, conhecimento do usuário |
| `feedback` | Correção do usuário ou approach não-óbvio validado (sempre com **Why:** + **How to apply:**) |
| `project` | Decisões/iniciativas/contexto que não está no código ou git |
| `reference` | Ponteiros pra sistemas externos (Linear, dashboards, canais) |

Estrutura: `MEMORY.md` é índice (1 linha por memória, ~150 chars). Memórias individuais têm frontmatter com `name`, `description`, `metadata.type`. Linkar com `[[name]]`.

**NÃO salvar:** code patterns, arquitetura, file paths, git history, debugging recipes, conteúdo já em CLAUDE.md, estado efêmero de task.

Anti-pattern: "salva esta lista de PRs". Resposta: perguntar o que foi *surpreendente* ou *não-óbvio*.

Detalhes: `packages/ok-playbook/patterns/memory.md` em qualquer projeto consumidor.

### Workflow superpowers — roteamento de modelos

Fluxo: `brainstorming` → `writing-plans` → `subagent-driven-development` (ou `executing-plans` em sessão separada).

Roteamento fixo de modelos (não avaliar complexidade da task):

| Papel | Model |
|---|---|
| Sessão principal (brainstorm + plan) | Opus |
| Implementer (subagente que executa tarefas) | Sonnet |
| Spec reviewer (subagente) | Sonnet |
| Code quality reviewer (subagente) | Opus |
| Final code reviewer (subagente) | Opus |

Substitui a seção "Model Selection" do skill `subagent-driven-development` que usa linguagem vaga ("most capable", "fast cheap").

### Cadência de testes e reviews

Default do skill: testes + reviews **a cada task**. Política OK: testes + reviews **só ao final de cada fase** do plano (`## Fase N — <nome>`; sem fases = plano inteiro como 1 fase). Implementer ainda commita por task. Final code review do plano inteiro continua.

Não aplicar quando: usuário pede review por task explícito; task crítica marcada (🚨); plano sem fases com menos de 5 tasks.

### Paralelismo

Sempre oferecer paralelismo quando o plano permitir. Classificar tasks como sequenciais (dependência de output) vs paralelas (arquivos disjuntos). Apresentar dispatch plan e pedir OK antes da fase. Skill: `superpowers:dispatching-parallel-agents`. Riscos: edição simultânea no mesmo arquivo, lockfile, setup steps, múltiplos commits no mesmo `.git` — em dúvida, sequencializar.

Detalhes: `packages/ok-playbook/patterns/superpowers-workflow.md` em qualquer projeto consumidor.
```
