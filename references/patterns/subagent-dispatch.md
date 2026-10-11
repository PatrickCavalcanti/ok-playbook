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
| Levantamento amplo de contexto antes de decidir (varrer N arquivos/módulos) | **Sim** (Scout no modelo menor; ver §4.1) |
| Leitura pontual de 1 arquivo cujo path já se conhece | **Não** (ler inline; overhead de dispatch não compensa) |
| Trabalho de doc/spec/plano | **Não** (esses ficam no controller; ver [`worktree.md §3`](./worktree.md)) |

**Sinal forte para despachar**: o controller começa a perder fluência por causa do volume de contexto de execução (logs longos, diffs grandes, output de testes). Subagente devolve só o resultado.

---

## 4. Política de modelos

> **Invariante: a revisão do conjunto / final roda no modelo mais forte disponível.**
> O resto depende do ambiente: sem desk de workers vale a divisão por papel
> (§4.2); com desk (Nidavellir) o plano distribui o trabalho entre as CLIs (§4.3).

| Papel | Sem desk (§4.2) | Com desk — Nidavellir (§4.3) |
|---|---|---|
| **Sessão principal** (planeja e orquestra) | a sessão que o usuário abriu — o playbook não fixa | idem |
| **Scout** (varre arquivos, extrai o relevante, devolve resumo — não muda código) | menor capaz | worker `scout` escolhido no plano |
| **Implementer** (executa task do plano) | menor capaz (rápido, barato) | worker `implementer` **por task**, pela dificuldade e pela cota |
| **Revisão de fase** (spec + qualidade, ao fim de cada fase; agentes separados) | menor capaz | worker `reviewer` médio/leve, de preferência de outro fornecedor que o implementador |
| **Revisão do conjunto / final** (gate da entrega) | maior capacidade | `reviewer` de maior capacidade com cota livre |

Alinhado a [`superpowers-workflow.md`](./superpowers-workflow.md). Esta política
**sobrescreve** linguagem vaga em skills externas ("use o modelo mais capaz",
"use um modelo rápido e barato") sem especificar papel.

### 4.1 Scout: levantamento de contexto antes da decisão

Levantamento amplo (varrer múltiplos arquivos/módulos, mapear convenções, extrair contratos, descobrir onde algo mora) é trabalho de leitura rápida — papel **Scout**, despachado no modelo menor (sem desk: Sonnet, tipicamente o agente `Explore`; com desk: um worker `scout`). O controller recebe só a conclusão e decide.

Padrão:

1. Controller identifica **o que precisa saber** — não o que precisa fazer.
2. Despacha um ou mais Scouts com escopo de leitura claro: "leia X, extraia Y, devolva resumo — não proponha mudança".
3. Controller sintetiza os retornos e define a implementação.

**Limites do Scout:**

- **Não compartilha o contexto da conversa.** Recebe só o prompt. Serve a levantamento bem-escopado, não a tarefa que depende da nuance da conversa inteira.
- **Leitura pontual fica no controller.** Um arquivo único cujo path já se conhece: ler inline é mais rápido que orquestrar um Scout. Scout compensa quando há varredura (múltiplos arquivos, convenção a descobrir, dump grande que sujaria a janela do controller).
- **Scout não decide.** "Levante e já implemente" empurra síntese para o modelo menor — viola §6.3. Scout devolve dados; o controller decide.

**Mecanismo:** o modelo da sessão principal **não troca no meio da tarefa**. Skill/CLAUDE.md não fazem hot-swap do controller. O ganho "o menor lê, o controller decide" vem de *delegar a leitura a um subagente/worker*, não de alternar o modelo do thread principal.

### 4.2 Sem desk de workers: divisão por papel

Quando a sessão só tem os subagentes da própria CLI, a divisão é por papel:
implementação no modelo econômico, revisão final no mais forte.

Tradução prática (Anthropic, 2026-Q4):

- Scout / implementer / revisão de fase → **Sonnet**.
- Revisão do conjunto / final → **Opus** (ou o modelo mais forte disponível no fornecedor).

**Por que por papel aqui**: sem ver cotas nem outros fornecedores, julgar caso a
caso "esta task merece o modelo grande?" é variabilidade arbitrária. A
assimetria fixa (econômico implementa, forte revisa) é mais robusta.

### 4.3 Com desk (Nidavellir): o plano distribui entre as CLIs

Quando a sessão alcança workers de várias CLIs (`list_workers`, `run_worker`,
`get_cli_usage_limits`), a escolha deixa de ser fixa e **vira parte do plano**. O
objetivo é duplo: cada task no worker que dá conta dela, e **as cotas de todas as
CLIs disponíveis rendendo** — não uma esgotada enquanto as outras ficam paradas.

1. **Levantar elenco e cota no momento do plano.** `list_workers` (description,
   `type`, `priority`, `cota`); para trabalho longo, `get_cli_usage_limits`. Não
   decidir de memória — elenco e cota mudam. Cota sem leitura (`nivel: null`) não
   é 0%: pesar pelo que se sabe da CLI.
2. **Cada task declara o implementador e o porquê**, numa linha do plano
   (`Implementer: <worker> — <dificuldade>; <cota>`). Critérios:
   - **dificuldade × capacidade** — `priority` do worker e o "use para / não use
     para" da description; implementação difícil (código delicado, muitas
     costuras, lógica sutil) vai para worker forte, task mecânica e bem
     especificada para worker leve. **Capacidade não autoriza decidir:** decisão
     aberta ou de desenho continua no controller (§6.3, §7), seja qual for o
     modelo do worker — o plano a resolve antes do dispatch;
   - **cota** — espalhar a carga pelas CLIs; não dar trabalho longo a CLI em cota
     crítica ou esgotada (ela pode parar no meio);
   - **worker da própria CLI** (`mesmaCli: true`) → preferir o subagente nativo
     (ferramenta Agent) com o mesmo modelo.
3. **Paralelizar o que for possível.** Tasks em arquivos disjuntos vão em
   paralelo, de preferência em CLIs diferentes — cotas diferentes trabalhando ao
   mesmo tempo. As regras de colisão continuam (mesmo arquivo ou lockfile =
   sequencial; em dúvida, sequencializar).
4. **O orquestrador executa os commits.** Com desk, worker **não commita** — nem
   em fase sequencial: devolve paths + mensagem proposta, e o controller commita
   com pathspec, um commit por task
   ([`superpowers-workflow.md`](./superpowers-workflow.md) §Commit em fase
   paralela — a mesma receita). Motivo: workers de CLIs diferentes seguem
   convenções de git diferentes e compartilham o índice. O controller não lê diff
   para commitar. Exceção: worktree por agente (índice próprio), onde o worker
   volta a commitar.
5. **Apresentar e sugerir no gate.** O mapa task → worker (e os revisores) entra
   no **gate único** do plano, junto com o mapa de paralelismo; o usuário aprova
   ou troca. Se o plano dá trabalho a CLI perto do limite, dizer qual é e quanto
   da cota já foi, e propor a troca.
6. **Revisão de fase**: reviewer médio/leve, de preferência de fornecedor
   diferente do implementador — pega o ponto cego do modelo que escreveu.
7. **Revisão do conjunto / final — invariante**: o reviewer de maior capacidade
   entre os **elegíveis** — elegível é o worker `reviewer` cuja CLI não está
   esgotada e cuja cota aguenta uma revisão do tamanho da entrega (cota crítica
   não elimina sozinha; eliminam esgotada ou folga menor que a revisão). Empate de
   capacidade: preferir outro fornecedor que o implementador. Nunca descer para um
   reviewer de capacidade menor por economia; se nenhum elegível de capacidade
   máxima existe, **dizer isso ao usuário** (entrega fica aguardando o reset ou a
   decisão dele), não rebaixar em silêncio. Mudança arriscada: segunda opinião
   forte de outro fornecedor.
8. **Sugerir mudança de elenco.** Se um worker se dá mal com um tipo de trabalho
   (review achando defeito recorrente no que ele entregou, task devolvida
   incompleta por incapacidade, lentidão desproporcional) ou se outro
   worker/modelo serviria melhor, o orquestrador **sugere** ao usuário: trocar o
   worker no resto do plano, ajustar description/`priority`, criar ou aposentar
   worker. A sugestão vai no report da fase ou da entrega — não é parada nova.
   Dentro do plano aprovado, trocar um worker que falhou **por desempenho** por
   outro de capacidade igual ou maior é decisão do controller, relatada.
   **BLOCKED por ambiguidade não é desempenho**: segue a lista de paradas (a
   decisão ausente se resolve antes de qualquer novo dispatch — trocar de worker
   não a supre).

**Risco a vigiar**: escolher sempre o mais barato. Por isso cada escolha vem
justificada no plano, e a revisão final forte não se negocia.

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

### 6.1 Discovery (Task 0) quando o plano cita o que não foi aberto

O gatilho não é a **procedência** do plano ("veio de outra sessão") — é a
**memória**: o risco existe sempre que o plano cita código que o planejador
**não abriu nesta sessão** (medido em 7 execuções: erro de costura mora
exatamente nessa fronteira; o planejador da própria sessão é igualmente cego, e
confia mais em si). Antes de despachar implementers:

- Confirmar que entidades referenciadas existem.
- Confirmar que helpers/funções citados estão exportados.
- Confirmar que assumptions do plano batem com a realidade.

Desvios são corrigidos no plano *antes* do primeiro dispatch. A forma barata e
suficiente dessa conferência é o **passo zero no prompt de cada dispatch**
(§6.3) — em 5 execuções medidas, zerou os erros de costura a custo de minutos,
enquanto uma folha de contratos elaborada (5 scouts em paralelo) não evitou os
críticos, que eram de lógica.

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
- **Passo zero de premissas**: símbolos, assinaturas e textos exatos que o step
  assume, com "se divergir, PARE e devolva BLOCKED — não adapte por conta".
- **Pergunta de julgamento no fim (obrigatória)**: sobre o que o subagente
  acabou de construir. Medido: numa execução, 5 achados vieram só dela.
- **Exceção autorizada de escopo fechado** quando o controller antecipa
  divergência tolerável — evita transformar todo desvio em BLOCKED.
- **Terceiro caminho — divergir e relatar**: quando o texto do plano contradiz o
  critério de verificação do próprio plano, o subagente segue o critério e
  relata. BLOCKED é para ambiguidade, não para erro óbvio do plano.
- **Proibições fixas do prompt-base** (não dependem de o controller lembrar):
  git destrutivo (`checkout -- .`, `checkout <sha> -- <path>`, `stash`, `reset`,
  `restore`, `clean`, `worktree remove` — repositório compartilhado entre
  sessões; um review já colidiu com stash alheia); esperar teste em background
  (foreground com timeout, ou report sem o teste); artefato de prova dentro do
  tree (harness/stub/versão antiga vão para o scratchpad).

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

- `git diff --cached --stat` — confirma o que vai entrar; staging pré-existente do usuário ou de outro agente pode contaminar. (Commit com pathspec — `git add -- <paths> && git commit -m "…" -- <paths>` — dispensa a conferência: o pathspec já ignora o resto do índice.)
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

**Exceção — dispatch paralelo na mesma worktree:** subagentes paralelos compartilham o índice do `.git`, então o output vira **só report** (working tree + paths tocados + mensagem de commit proposta) e quem commita é o controller, com `git add -- <paths> && git commit -q -m "msg" -- <paths>`. Detalhe em [`superpowers-workflow.md §Paralelismo`](./superpowers-workflow.md). Em dispatch sequencial, ou com uma worktree por agente, vale a forma normal acima.

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
| Sem desk: avaliar complexidade da task para escolher modelo | Variabilidade arbitrária; usa regra por papel (§4.2) |
| Com desk: escolher worker sem justificativa no plano, ou sempre o mais barato | A escolha por task só se sustenta com o porquê escrito (§4.3) |
| Com desk: decidir o elenco de memória, sem `list_workers`/cota | Elenco e cota mudam; CLI esgotada para no meio da task |
| Sem desk: implementer no modelo mais forte "porque é importante" | Cara sem ganho; o forte compensa na revisão final (com desk, worker forte para task difícil é escolha legítima — com o porquê no plano, §4.3) |
| Revisão do conjunto / final em modelo menor "para economizar" | É o gate da entrega, onde o modelo grande compensa; economizar ali zera o valor da revisão (a revisão de fase no modelo menor é a política, §4) |
| Levantamento amplo feito inline no controller quando dava pra delegar a um Scout | Queima janela e tempo do controller; Scout devolve só o resumo (§4.1) |
| Scout despachado para ler 1 arquivo de path conhecido | Overhead de dispatch > ganho; leia inline |
| Scout que "já implementa" o que levantou | Empurra decisão pro modelo menor; Scout devolve dados, o controller decide |
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

- [ ] Modelo escolhido conforme §4: sem desk, por papel; com desk, worker por task com o porquê no plano e mapa aprovado no gate (MUST)
- [ ] Prompt do subagente tem task única, contexto, escopo, critério de done (MUST)
- [ ] Prompt instrui devolver BLOCKED em vez de improvisar (MUST)
- [ ] Subagente não foi instruído a instalar deps (MUST)

### Durante execução

- [ ] Per-task commits (default) — exceção justificada por acoplamento (SHOULD)
- [ ] `git diff --cached --stat` antes de cada commit (MUST)
- [ ] Em multi-repo: `git -C <path>` em toda operação git (MUST)
- [ ] Testes da task passaram antes do commit (MUST quando o projeto tem testes)

### Após execução

- [ ] Review do conjunto (papel de revisão forte) rodou, **re-rodou depois das
      correções**, com a worktree atualizada contra a base — confirmado por
      escrito no report de entrega (MUST — é o gate da entrega; achou o defeito
      crítico em 7 de 7 execuções medidas; prompt dirigido em
      [`dev-process.md §4`](./dev-process.md))
- [ ] Entrega perguntou merge × usar na worktree — **nenhum merge sem pedido** (MUST)
- [ ] Worktree limpa com `git worktree remove` (não `rm -rf` manual) (MUST)
- [ ] Feedback de fricções do despache registrado (ver [`feedback-loop.md`](./feedback-loop.md)) (SHOULD)

### Anti-padrões ausentes

- [ ] **NÃO** existe implementação no modelo mais forte sem motivo escrito no plano
- [ ] **NÃO** existe revisão do conjunto / final em modelo menor que o mais forte disponível
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
- Nova plataforma de modelo que mude a tradução de "menor capaz / maior capacidade" → §4.2 (tradução prática).
- Critério de distribuição entre workers provado em uso (ou worker que falhou num tipo de trabalho) → §4.3.

Mudanças aplicadas via PR + revisão. Sem mudança silenciosa.
