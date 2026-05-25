# Superpowers — Workflow e Roteamento de Modelos

> **Escopo:** user-level. Vai em `~/.claude/CLAUDE.md` via `install/global-claude-md-snippet.md` (resumo). Este doc é a referência detalhada.

Política da OK para uso dos skills `superpowers-marketplace` (plugin do Claude Code) no fluxo brainstorming → writing-plans → subagent-driven-development. Não substitui a documentação interna dos skills — define como integrá-los, qual modelo usar em cada papel, e quando rodar testes/reviews.

---

## Pré-requisito

Plugin `superpowers-marketplace` instalado via `claude /plugin install`.

---

## Fluxo canônico

- `brainstorming` — antes de qualquer trabalho criativo (criar feature, modificar comportamento, design). Sessão atual.
- `writing-plans` — depois de spec aprovada, antes de implementação. Sessão atual.
- `subagent-driven-development` — execução do plano em subagentes paralelos/sequenciais. Sessão atual orquestra.
- `executing-plans` — alternativa: executar o plano em sessão separada com review checkpoints (quando a implementação é longa demais pra caber numa sessão).

---

## Roteamento de modelos (regra fixa, não avaliar complexidade da task)

| Papel | Model |
|---|---|
| Sessão principal (brainstorm + plan) | Opus (iniciar a sessão com Opus via settings padrão ou `/model`) |
| Implementer (executa tarefas do plano) | Sonnet |
| Spec reviewer (verifica conformidade com spec) | Sonnet |
| Code quality reviewer (revisa qualidade) | Opus |
| Final code reviewer (revisão final completa) | Opus |

Justificativa: Sonnet é eficiente pra execução estruturada (plano define o quê). Opus é necessário pra julgamento arquitetural e review final.

Nota: esta política substitui a seção "Model Selection" do skill `subagent-driven-development` que usa linguagem vaga ("most capable", "fast cheap model").

---

## Cadência de testes e reviews

Política que substitui o default do skill:

| Etapa | Default do skill | Política OK |
|---|---|---|
| Implementer roda steps da task | sim | sim |
| Implementer commita ao final da task | sim | sim (preservar) |
| Testes da task isolada | sim | **não** |
| Spec review por task | sim | **não** |
| Code quality review por task | sim | **não** |
| Testes acumulados da fase | — | **sim**, ao final da fase |
| Spec review da fase | — | **sim**, ao final da fase |
| Code quality review da fase | — | **sim**, ao final da fase |
| Final code review do plano completo | sim | sim (preservar) |

- **Definição de "fase":** header `## Fase N — <nome>` (ou `# Phase N — <nome>`) no plano. Sem fases explícitas, plano inteiro = 1 fase.
- **Justificativa:** reviews por task em planos longos geram overhead desproporcional. Agrupar por fase mantém ciclo de feedback relevante (fase = unidade entregável) e reduz custo.
- **Trade-off aceito:** bugs cedo aparecem só no review do fim da fase. Mitigação: implementer commita por task → `git bisect` continua barato.
- **Quando NÃO aplicar:**
  - Usuário pede review por task explícito.
  - Task individual marcada como crítica/arriscada (header com 🚨 ou nota "review obrigatório aqui").
  - Plano sem fases curto (< 5 tasks).

---

## Paralelismo de subagentes

Sempre oferecer paralelismo quando o plano permitir.

Antes de despachar uma fase, classificar tasks:
- **Sequenciais** — task B depende de arquivo/símbolo criado por task A.
- **Paralelas** — tasks tocam arquivos disjuntos e não dependem do output uma da outra.

Apresentar dispatch plan ao usuário antes da fase:
> "Fase X tem N tasks: A→B sequenciais, C/D/E independentes. Vou dispatchar A, depois B, depois C/D/E juntos. OK?"

Skill aplicável: `superpowers:dispatching-parallel-agents` (dispatch simultâneo via múltiplas tool calls no mesmo bloco) para paralelas; default sequencial do `subagent-driven-development` para o resto.

**Riscos a vigiar:**
- Edições simultâneas no mesmo arquivo → sequencializar mesmo que pareçam independentes.
- Tasks que escrevem `package.json`/lockfile → race garantida → sequencializar.
- Tasks de setup/scaffold → rodar antes das dependentes.
- Múltiplos commits no mesmo `.git` em paralelo → risco de `index.lock`; prompts devem instruir retry.

**Em dúvida:** sequencializar. Custo de errar pro lado seguro é baixo; custo de race é alto.

---

## Worktree + workflow

Implementação roda em worktree (subagent-driven-development); brainstorm e plano vão direto em main ou branch atual. Ver [`worktree.md`](./worktree.md).

---

## Permissões e commits

Com permissões de worktree configuradas (ver [`permissions.md`](./permissions.md)), commits per-task ficam livres — implementer commita ao final de cada task (default do skill `subagent-driven-development`). Não há política global de "batch no fim".
