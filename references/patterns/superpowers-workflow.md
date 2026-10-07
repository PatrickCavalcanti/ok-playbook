# Superpowers — Workflow e Roteamento de Modelos

> **Escopo:** project-level. O resumo entra no `CLAUDE.md` do projeto via o bloco de regras do playbook. Este doc é a referência detalhada.

Política deste playbook para uso dos skills `superpowers-marketplace` (plugin do Claude Code) no fluxo brainstorming → writing-plans → subagent-driven-development. Não substitui a documentação interna dos skills — define como integrá-los, qual modelo usar em cada papel, e quando rodar testes/reviews. Cada projeto consumidor pode ajustar a política, mas o default é o descrito aqui.

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

## Roteamento por papel (regra fixa, não avaliar complexidade da task)

A política é por **papel**; os nomes de modelo são o mapeamento atual e podem ser
reconfigurados por projeto sem mudar o processo. O invariante é a **assimetria**:
implementação no modelo econômico, revisão final no mais capaz disponível.

| Papel | Hoje mapeado para |
|---|---|
| Sessão principal (brainstorm + plan) | Opus (iniciar a sessão com ele via settings ou `/model`) |
| Implementer (executa tarefas do plano) | Sonnet |
| Spec reviewer (conformidade com spec) | Sonnet |
| Revisão de fase (qualidade, agentes separados) | Sonnet |
| Revisão forte (conjunto, final) | Opus |

Nota: esta política substitui a seção "Model Selection" do skill
`subagent-driven-development` que usa linguagem vaga ("most capable", "fast
cheap model"). ⚠️ Aposta registrada: a revisão de fase em Sonnet achou defeito
real nas 4 execuções medidas, mas a base histórica rodava em Opus — reavaliar se
a taxa cair.

---

## Cadência de testes e reviews

> **A cadência canônica agora vive em [`dev-process.md`](./dev-process.md) §4**
> (quatro fluxos, entrega no fim do plano, suíte só via script com baseline,
> teste com banco fora por padrão, review do conjunto como gate da entrega com o
> prompt dirigido das oito formas). Este bloco resume o que substitui o default
> do skill:

| Etapa | Default do skill | Política aqui |
|---|---|---|
| Implementer roda steps da task | sim | sim |
| Implementer commita ao final da task | sim | sim — **exceto em fase paralela**, onde quem commita é o controller (ver §Paralelismo) |
| Testes por task / review por task | sim | **não** |
| Testes ao fim da fase | — | **só o que a fase escreveu**, rodados direto |
| Suíte global | por task | **só via script do projeto** com verde de referência (baseline) — sem script, não roda |
| Spec + quality review da fase | — | **sim**, ao final da fase |
| Review do conjunto (revisão forte) | sim | sim — **gate da entrega**: re-roda após correções, base atualizada, confirmado por escrito |
| TDD | sim | **não obrigatório** — teste antes da entrega só em correção de bug |

- **Definição de "fase":** header `## Fase N — <nome>` (ou `# Phase N — <nome>`) no plano. Sem fases explícitas, plano inteiro = 1 fase.
- **Trade-off aceito:** bugs cedo aparecem só no review do fim da fase. Mitigação: implementer commita por task → `git bisect` continua barato.
- **Quando NÃO aplicar:**
  - Usuário pede review por task explícito.
  - Task individual marcada como crítica/arriscada (header com 🚨 ou nota "review obrigatório aqui").
  - Plano sem fases curto (< 5 tasks).

---

## Paralelismo de subagentes

Sempre oferecer paralelismo quando o plano permitir.

Classificar tasks:
- **Sequenciais** — task B depende de arquivo/símbolo criado por task A.
- **Paralelas** — tasks tocam arquivos disjuntos e não dependem do output uma da outra.

### Um gate só, antes do plano

A classificação é apresentada **uma vez, para o plano inteiro**, antes do primeiro dispatch — não fase a fase:

> "O plano tem 3 fases. Fase 1: A→B sequenciais. Fase 2: C/D/E em paralelo (arquivos disjuntos), commit por mim. Fase 3: F sozinha. Testes e reviews ao fim de cada fase. OK?"

Aprovado o mapa, **executar todas as fases sem novo pedido de OK**. Entre fases o controller *reporta* (o que entrou, o que os reviews acharam) — não pergunta. Parar entre fases de um plano aprovado contradiz o perfil `dev-early` ("executar planos longos sem pedir confirmação a cada etapa", ver [`profiles.md`](./profiles.md)) e é a fricção que essa regra existe pra evitar.

### Quando parar no meio do plano

Lista fechada — fora dela, decidir e seguir, relatando no fim da fase:

- Subagente devolve **BLOCKED / NEEDS_CONTEXT** (ambiguidade não coberta pelo plano).
- Review ou teste de fim de fase revela algo que **exige mudar plano ou spec**.
- A classificação aprovada se mostra **errada de forma arriscada** (duas tasks paralelas colidem em arquivo ou lockfile não previsto).
- Aparece **ação destrutiva ou fora do escopo** do plano (dado em banco, `main`, dep nova pesada).

Perfis mais conservadores (`dev-stable`, `review`) mantêm seus próprios pontos de parada — a lista acima é o piso, não o teto.

### Commit em fase paralela é do controller

Subagentes paralelos na mesma worktree **compartilham o índice do `.git`**: `git add` de um pode ser capturado pelo `git commit` de outro, gerando commit com conteúdo de A e mensagem de B. Em **fase paralela**, portanto:

- O implementer **não commita**. Entrega working tree + report contendo **os paths que tocou** e **a mensagem de commit proposta** (Conventional Commits, como escreveria se commitasse).
- O controller commita task a task, com pathspec explícito:
  ```bash
  git add -- packages/a/src/x.js packages/a/test/x.test.js && git commit -q -m "feat(x): ..." -- packages/a/src/x.js packages/a/test/x.test.js
  ```
  O `git add` dos paths cobre **arquivo novo** — `git commit --only -- <path>` falha com `pathspec did not match` em arquivo que o índice ainda não conhece. O commit com pathspec leva **só** aqueles paths, mesmo que outro processo tenha staged outra coisa. Na mesma chamada (`&&`) para encolher a janela entre add e commit. ⚠️ `-m` vem **antes** do `--`; depois, a mensagem vira pathspec.
  **Limite:** duas tasks que tocam o **mesmo arquivo** não se separam por pathspec — o commit leva os hunks das duas. Por isso mesmo arquivo = sequencial (§Riscos); se aconteceu, um commit só, com as duas mensagens no corpo.
- Uma verificação por fase (não por task): `git status --porcelain` depois do lote, pra pegar arquivo deixado de fora por report impreciso.

**O controller não lê diff pra commitar.** Não abre arquivo, não roda `git diff`, não julga a mudança — a mensagem vem pronta de quem tem o contexto. É execução mecânica, e é isso que mantém a janela do controller (modelo caro) barata: ~2 linhas a mais por report, ~1 linha de retorno por commit. Se for preciso ler o diff pra saber o que escrever, a regra foi violada — devolver o commit ao implementer.

Granularidade não se perde: um commit por task, então `git bisect` continua barato.

Em **fase sequencial** nada muda — o implementer commita ao final da task (default do skill).

**Escape hatch:** se o custo de contexto incomodar, a saída é **worktree por agente paralelo** (índice próprio em `.git/worktrees/<name>/index`, implementer volta a commitar), não delegar o commit a outro subagente — delegar custaria mais, porque exigiria reenviar os reports.

### Skill e riscos

Skill aplicável: `superpowers:dispatching-parallel-agents` (dispatch simultâneo via múltiplas tool calls no mesmo bloco) para paralelas; default sequencial do `subagent-driven-development` para o resto.

**Riscos a vigiar:**
- Edições simultâneas no mesmo arquivo → sequencializar mesmo que pareçam independentes.
- Tasks que escrevem `package.json`/lockfile → race garantida → sequencializar.
- Tasks de setup/scaffold → rodar antes das dependentes.

**Em dúvida:** sequencializar. Custo de errar pro lado seguro é baixo; custo de race é alto.

---

## Worktree + workflow

Implementação roda em worktree (subagent-driven-development); brainstorm e plano vão direto em main ou branch atual. Ver [`worktree.md`](./worktree.md).

---

## Permissões e commits

Com permissões de worktree configuradas (ver [`permissions.md`](./permissions.md)), commits per-task ficam livres — implementer commita ao final de cada task (default do skill `subagent-driven-development`). Não há política global de "batch no fim".
