# Subagent Dispatch Partners

> **Padrão de processo, project-agnostic.** Define como um agente principal (controller) despacha trabalho para subagentes — política de modelos, granularidade de tasks, regras de isolamento, e composição com worktrees. Foco em *como o controller orquestra*; o que cada subagente faz é problema do plano.
>
> **Quando este documento entrar em conflito com a prática, a prática vence — atualize o documento.**

---

## 1. Propósito

Trabalho não-trivial (plano de implementação com 3+ tasks, refactor cross-cutting, migração com várias frentes) se beneficia de delegar passos para subagentes em vez de o controller executar tudo inline. Subagentes:

- Mantêm o controller com janela de contexto enxuta.
- Permitem paralelismo de tasks independentes.
- Especializam papéis (implementer ≠ reviewer ≠ spec reviewer).

Mas subagente mal despachado é pior que execução inline: gasto extra com pouco ganho, decisão arquitetural delegada a quem não tem contexto, dependências instaladas em path errado, commit em cwd drifted.

Este doc serve a três usos:

1. **Direcionar** o controller na hora de decidir despachar — quando vale, com qual modelo, com qual granularidade.
2. **Verificar** se um plano executado por subagentes seguiu o padrão.
3. **Adaptar** a política para o stack do projeto.

**Pré-requisito**: leia [`worktree.md`](./worktree.md) se o plano envolver código de produção — worktree e subagentes andam juntos.

---

## 2. Como usar este doc

**Modo criação.** Antes de despachar subagentes pela primeira vez num plano, leia §3 (quando vale), §4 (modelos) e §6 (workflow). Use o checklist do §11 antes do primeiro dispatch.

**Modo verificação.** Pós-execução, rode o checklist contra o histórico de mensagens — confirma se modelos certos foram usados, se commits granulares foram criados, se subagente não tomou decisão fora do plano.

---

## 3. Quando despachar subagentes

| Situação | Despachar? |
|---|---|
| Plano com 3+ tasks independentes | **Sim** (paralelismo + janela enxuta) |
| Plano com 1-2 tasks fortemente acopladas | **Não** (execução inline é mais simples) |
| Task experimental que pode ser descartada | **Sim** (subagente em worktree contém o estrago) |
| Edição de 1 arquivo / 1 commit | **Não** (overhead não compensa) |
| Tarefa que precisa de revisão entre passos | **Sim** (papéis separados de implementer/reviewer cabem aqui) |
| Levantamento amplo de contexto antes de decidir (varrer N arquivos/módulos) | **Sim** (Scout em Sonnet; ver §4.1) |
| Leitura pontual de 1 arquivo cujo path já se conhece | **Não** (ler inline; overhead de dispatch não compensa) |
| Trabalho de doc/spec/plano | **Não** (esses ficam no controller; ver [`worktree.md §3`](./worktree.md)) |

**Sinal forte para despachar**: o controller começa a perder fluência por causa do volume de contexto de execução (logs longos, diffs grandes, output de testes). Subagente devolve só o resultado.

---

## 4. Política de modelos

> **Regra fixa por papel — não avaliar complexidade da task.**

| Papel do subagente | Modelo |
|---|---|
| **Scout** (varre arquivos, extrai o relevante, devolve resumo — não muda código) | menor capaz |
| **Implementer** (executa task do plano) | menor capaz (rápido, barato) |
| **Spec reviewer** (verifica conformidade com spec) | menor capaz |
| **Code quality reviewer** (revisão de qualidade entre tasks) | maior capacidade |
| **Final code reviewer** (revisão final completa antes de fechar) | maior capacidade |

Tradução prática (Anthropic em 2026-Q2):

- Scout / implementer / spec reviewer → **Sonnet**.
- Code quality reviewer / final reviewer → **Opus**.

**Por que fixa**: avaliar caso-a-caso "esta task é complexa o bastante para Opus?" introduz variabilidade arbitrária. Implementação repetitiva no Sonnet, decisão arquitetural no Opus — separação por papel é mais robusta que por percepção de complexidade.

Esta política **sobrescreve** linguagem vaga em skills externas que digam coisas como "use o modelo mais capaz" ou "use um modelo rápido e barato" sem especificar papel.

### 4.1 Scout: levantamento de contexto antes da decisão

Levantamento amplo (varrer múltiplos arquivos/módulos, mapear convenções, extrair contratos, descobrir onde algo mora) é trabalho de leitura rápida — papel **Scout**, despachado em **Sonnet** (tipicamente o agente `Explore`). O controller (Opus) recebe só a conclusão e decide.

Padrão:

1. Controller (Opus) identifica **o que precisa saber** — não o que precisa fazer.
2. Despacha um ou mais Scouts (Sonnet) com escopo de leitura claro: "leia X, extraia Y, devolva resumo — não proponha mudança".
3. Controller sintetiza os retornos e define a implementação em Opus.

**Limites do Scout:**

- **Não compartilha o contexto da conversa.** Recebe só o prompt. Serve a levantamento bem-escopado, não a tarefa que depende da nuance da conversa inteira.
- **Leitura pontual fica no controller.** Um arquivo único cujo path já se conhece: ler inline é mais rápido que orquestrar um Scout. Scout compensa quando há varredura (múltiplos arquivos, convenção a descobrir, dump grande que sujaria a janela do controller).
- **Scout não decide.** "Levante e já implemente" empurra síntese para o Sonnet — viola §6.3. Scout devolve dados; Opus decide.

**Mecanismo:** o modelo da sessão principal **não troca no meio da tarefa**. Skill/CLAUDE.md não fazem hot-swap do controller. O ganho "Sonnet lê, Opus decide" vem de *delegar a leitura a um subagente Sonnet*, não de alternar o modelo do thread principal.

---

## 5. Granularidade de tasks e commits

**Default recomendado: per-task commits + per-task tests.**

Com permissões de worktree configuradas conforme [`worktree.md §6`](./worktree.md), o motivo histórico para batchar tudo no fim (prompt-spam em git status/diff/commit) deixou de existir. Padrão canônico:

- **Per-task commits** — granularidade habilita revert, bisect, e recuperação parcial.
- **Per-task tests** — TDD vira viável; bugs aparecem na task que os introduziu.
- **Per-task reviews** (spec + code quality entre tasks) — quando o plano tem risco arquitetural alto.

**Quando bater no fim faz mais sentido:**

- Plano curto (1-2 tasks fortemente acopladas, refactor coordenado).
- Tasks que tocam o mesmo arquivo e ficaria estranho separar.

Decisão do plano + skill, não regra global. Mas o default é per-task.

---

## 6. Workflow do controller

### 6.1 Discovery (Task 0) quando spec vem de fora

Se o plano que está prestes a executar foi escrito em outra sessão ou por outro agente, antes de despachar implementers, rode uma **Task 0 de discovery** contra o código real:

- Confirmar que entidades referenciadas existem.
- Confirmar que helpers/funções citados estão exportados.
- Confirmar que assumptions do plano batem com a realidade.

Desvios encontrados em discovery são corrigidos no plano *antes* do primeiro dispatch. Notas de desvio que aparecem só na execução (ex: "spec assume tabela X; código usa Y") deveriam ter sido pegas aqui.

### 6.2 Setup de ambiente antes do dispatch

Controller faz, subagente não:

- `npm install` / `pnpm install` / equivalente.
- Junctions de `node_modules` (ver [`worktree.md §5.2`](./worktree.md)).
- Cópia/commit de arquivos uncommitted (spec, plano, feedbacks) para a worktree.
- Setup de DB de teste, mocks de serviço externo.

**Subagentes não instalam deps.** Se a dep nova entrou no plano, controller instala no checkout principal com `npm install --no-save <pkg>` (junction picks up) e a entrada formal em `package.json` é commitada pela task que a justifica.

### 6.3 Prompt do subagente

Mínimo do prompt:

- **Task atual** (uma só, com critério de "done" claro).
- **Contexto necessário** (spec linkada, plano linkado, arquivos relevantes).
- **Escopo de mudança** (que arquivos pode tocar; que não pode tocar).
- **Critério de validação** (testes que devem passar, lint, type-check).
- **Protocolo de bloqueio** ("se encontrar ambiguidade não-coberta no plano, devolver BLOCKED com pergunta; não decidir sozinho").

**Não delegue síntese.** "Com base na sua análise, implemente X" empurra decisão para o subagente. Prompt diz exatamente o que mudar, onde, e como verificar.

**Passe o diretório de trabalho em TEXTO, não como `cd` no comando.**

```
❌  "Rode `cd e:/Projetos/App/.worktrees/feat && npm test`"
✅  "Você trabalha em e:/Projetos/App/.worktrees/feat. Rode `npm test` a partir de lá."
```

O cwd do Bash tool **persiste entre chamadas** — um `cd` no primeiro comando basta, e mesmo ele costuma ser desnecessário. Já mandar `cd <path> &&` colado em cada comando é a causa nº 1 de prompt de permissão: o matcher trata `cd` como context-changing e `Bash(npm *)` deixa de casar (medido: ~70% das chamadas Bash em dois projetos, ver [`./permissions.md`](./permissions.md)). Um prompt de subagente que ensina o formato errado reproduz a fricção em cada task despachada — e o subagente não tem como saber que está pagando esse custo.

Para git em multi-repo, `git -C <path>` continua sendo a forma certa (§6.4) — ele não tem o problema do `cd`.

### 6.4 Verificações antes do commit

Em **toda** task antes do `git commit`:

- `git diff --cached --stat` — confirma o que vai entrar; staging pré-existente do usuário ou de outro agente pode contaminar.
- Testes da task passaram (não só "compilei").
- Type-check / lint passaram (quando o projeto usa).

Em multi-repo (projeto principal + sidecar), sempre `git -C <path>` em vez de confiar no cwd. cwd dá drift em sessões longas.

---

## 7. Regras de isolamento do subagente

| Regra | Por quê |
|---|---|
| Subagente não toma decisão arquitetural | Não tem contexto histórico do projeto; decisões viram inconsistência |
| Subagente não instala deps | Controller centraliza ambiente; subagentes consomem |
| Subagente não modifica spec/plano | Spec/plano são input imutável; mudanças voltam para o controller |
| Subagente não despacha outros subagentes | Hierarquia plana — controller é o único orquestrador |
| Subagente devolve BLOCKED em vez de improvisar | Improviso silencioso é a maior fonte de divergência plano ↔ execução |

**Subagente é função pura**: input (prompt + workspace) → output (commit + report). Side-effects fora disso são bug.

---

## 8. Multi-repo e drift

Quando o trabalho cruza repos (projeto principal + serviço satellite + lib compartilhada):

- **`git -C <path>` em toda operação git.** Sem exceção. cwd drift é silencioso e venenoso.
- **Permissões por repo.** Worktrees do projeto principal não dão liberdade no satellite; cada repo precisa do próprio bloco em `.claude/settings.json` (ver [`worktree.md §6.2`](./worktree.md)).
- **Ordem de sincronização**: mudança no projeto principal que depende de mudança no satellite — fazer no satellite primeiro, instalar, depois consumir.

---

## 9. Composição com worktrees

Worktree e subagentes são padrões complementares:

- Worktree isola o working tree do trabalho (ver [`worktree.md`](./worktree.md)).
- Subagentes paralelizam dentro daquele working tree.

Padrão canônico de fase de implementação:

```
1. Spec + plano escritos no checkout principal (main).
2. Commit de spec/plano antes de criar worktree (uncommitted não vai).
3. Controller cria worktree (git worktree add) + junctions de node_modules.
4. Controller despacha subagentes contra a worktree.
5. Subagentes commitam per-task na branch da worktree.
6. Ao terminar: merge ou PR → cleanup da worktree.
```

Sem worktree, subagentes que falham deixam estado órfão no checkout principal. Com worktree, custo é `git worktree remove`.

---

## 10. Anti-padrões

| Anti-padrão | Por quê |
|---|---|
| Avaliar complexidade da task para escolher modelo | Variabilidade arbitrária; usa regra por papel (§4) |
| Implementer em Opus "porque é importante" | Cara sem ganho; Sonnet implementa, Opus revisa |
| Reviewer em Sonnet "para economizar" | Revisão é onde o modelo grande compensa; economizar ali zera o valor da revisão |
| Levantamento amplo feito inline no Opus quando dava pra delegar a um Scout Sonnet | Queima janela e tempo do controller; Scout devolve só o resumo (§4.1) |
| Scout despachado para ler 1 arquivo de path conhecido | Overhead de dispatch > ganho; leia inline |
| Scout que "já implementa" o que levantou | Empurra decisão pro Sonnet; Scout devolve dados, Opus decide |
| Subagente decidindo escopo quando o plano não cobre | Improviso silencioso vira divergência plano ↔ código |
| Subagente instalando dep | Quebra centralização do ambiente; package-lock divergente |
| Controller pulando discovery (Task 0) quando spec vem de fora | Desvios viram bugs descobertos na metade da execução |
| Commit sem `git diff --cached --stat` | Staging pré-existente contamina; vira commit "limpeza misturada com feature" |
| `git commit` confiando no cwd em multi-repo | cwd drifta; commit vai pro repo errado |
| Batch de commits no fim por hábito | Default agora é per-task; batch só por decisão deliberada |
| Subagente despachando outro subagente | Hierarquia profunda quebra debugabilidade |
| Subagente modificando spec/plano | Spec/plano são input; mudanças voltam ao controller |

---

## 11. Checklist de verificação

### Antes do primeiro dispatch

- [ ] Decisão de despachar justificada por §3 (3+ tasks, paralelismo viável) (MUST)
- [ ] Se spec/plano vêm de fora: Task 0 de discovery rodada (SHOULD)
- [ ] Worktree criada (se aplicável) e junctions configuradas (MUST quando há worktree)
- [ ] Spec + plano + feedbacks commitados antes da worktree (MUST quando há worktree)
- [ ] Permissões de worktree configuradas no `.claude/settings.json` (MUST quando há worktree)

### Por dispatch

- [ ] Modelo escolhido por papel (§4), não por complexidade (MUST)
- [ ] Prompt do subagente tem task única, contexto, escopo, critério de done (MUST)
- [ ] Prompt instrui devolver BLOCKED em vez de improvisar (MUST)
- [ ] Subagente não foi instruído a instalar deps (MUST)

### Durante execução

- [ ] Per-task commits (default) — exceção justificada por acoplamento (SHOULD)
- [ ] `git diff --cached --stat` antes de cada commit (MUST)
- [ ] Em multi-repo: `git -C <path>` em toda operação git (MUST)
- [ ] Testes da task passaram antes do commit (MUST quando o projeto tem testes)

### Após execução

- [ ] Final code reviewer (Opus) rodou antes de fechar (SHOULD)
- [ ] Worktree limpa com `git worktree remove` (não `rm -rf` manual) (MUST)
- [ ] Feedback de fricções do despache registrado (ver [`feedback-loop.md`](./feedback-loop.md)) (SHOULD)

### Anti-padrões ausentes

- [ ] **NÃO** existe subagente em Opus para implementação
- [ ] **NÃO** existe subagente em Sonnet para revisão final
- [ ] **NÃO** existe subagente instalando deps
- [ ] **NÃO** existe subagente despachando outro subagente
- [ ] **NÃO** existe commit feito confiando no cwd em multi-repo

---

## 12. Composição com outros patterns

| Pattern | Como compõe |
|---|---|
| [`worktree.md`](./worktree.md) | Worktree é o ambiente padrão de dispatch; permissões e setup são pré-requisito |
| [`agent.md`](./agent.md) | Controller é um agente; subagentes geralmente não — são executores efêmeros |
| [`feedback-loop.md`](./feedback-loop.md) | Fricções no despache (instalação que quebrou, prompt que confundiu subagente) viram entrada no backlog do agente controller |
| [`code-design.md`](./code-design.md) | Final code reviewer aplica o checklist do code-design contra o resultado completo |

---

## 13. Inspirações e evolução

Padrão extraído da prática com `superpowers:subagent-driven-development` e da política global do usuário. A política de modelos por papel substitui a linguagem vaga ("most capable", "fast cheap model") que vem nos skills upstream.

Para evoluir:

- Nova categoria de papel descoberta (além de implementer / spec reviewer / code quality / final) → §4.
- Padrão de prompt do subagente provado melhor em uso real → §6.3.
- Nova armadilha de multi-repo identificada → §8.
- Nova plataforma de modelo que mude a tradução de "menor capaz / maior capacidade" → §4 (tradução prática).

Mudanças aplicadas via PR + revisão. Sem mudança silenciosa.
