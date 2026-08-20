<!--
  ok-playbook — Include para o CLAUDE.md do consumidor.

  O CLAUDE.md do projeto importa este arquivo por referência (@<playbook-root>install/claude-md-include.md).
  Não copie e cole o conteúdo: uma cópia inline não recebe atualizações do playbook,
  e o drift é silencioso — ninguém percebe que parou de acompanhar.

  Este bloco é comentário HTML de propósito: tudo abaixo dele é importado
  literalmente pro contexto da sessão, então nada aqui pode falar com o
  mantenedor do playbook em vez de falar com o agente.

  <playbook-root> resolve via `playbookRoot` no ok-playbook.config.json do
  consumidor (default: node_modules/ok-playbook/). Nunca hardcode o caminho
  de instalação neste arquivo — ele varia por projeto (npm, submódulo, workspace).
-->

## Antes de começar

Qual o modo de operação desta sessão? **dev-early**, **dev-stable** ou **review**.

Responda com o número ou nome. Se não responder, assumir **dev-early**.

Detalhes: `<playbook-root>patterns/profiles.md`. Regras git: `<playbook-root>patterns/git.md`. Permissões: `<playbook-root>patterns/permissions.md`.

---

## ok-playbook (padrões de desenvolvimento)

Este projeto consome o `ok-playbook`. **Onde ele está instalado é `<playbook-root>`, resolvido via `ok-playbook.config.json`** — leia o config antes de tentar abrir qualquer arquivo do playbook. **Leia os patterns antes de qualquer trabalho de arquitetura, agentes ou subagentes:**

- **Patterns (princípios agnósticos):** `<playbook-root>patterns/`
  - `code-design.md` — 5 camadas, naming, ponto de contato, fractal, ARCHITECTURE.md
  - `worktree.md` — quando criar worktree, permissões do Claude Code
  - `feedback-loop.md` — produtor → backlog → processador → atualização
  - `agent.md` — quando criar agente, anatomia, trio canônico
  - `subagent-dispatch.md` — política de modelos, granularidade, isolamento
  - `git.md` — convenções de branches, commits, bloqueados
  - `profiles.md` — modos de operação canônicos
  - `permissions.md` — filosofia de `.claude/settings.json`; rules de shell (forma do comando) **e** de arquivo (âncora de path)
  - `command-forms.md` — **forma canônica de cada ação** (onde rodar, ler/escrever, shell, destrutivo); a coluna "evite" é a que custa prompt
  - `memory.md` — tipologia de memórias persistentes do projeto
  - `superpowers-workflow.md` — workflow superpowers + roteamento por papel
  - `dev-process.md` — **o processo de trabalho**: quatro fluxos, plano, reviews dirigidos, scripts de processo, entrega, pendências, sinal de atenção
  - `docs-structure.md` — hierarquia `<docs-root>` + `_index.md` da arquitetura + ciclo de specs/planos

- **Agents agnósticos:** `<playbook-root>agents/` — `docs-review`, `new-agent`, `playbook-audit`, `permissions-review`, `playbook-contribute`
- **Templates:** `<playbook-root>templates/` — feedback, draft, insight, ARCHITECTURE, `_index`

### Resolução de placeholders deste projeto

Os patterns e agentes do playbook usam placeholders como `<backlog-root>`, `<docs-root>`, etc. **Resolva sempre via `ok-playbook.config.json` no root deste projeto** — não use defaults nem suposições.

Mapeamento canônico:

| Placeholder | Campo em `ok-playbook.config.json` |
|---|---|
| `<playbook-root>` | `playbookRoot` (opcional; default `node_modules/ok-playbook/`) |
| `<docs-root>` | `paths.docs` |
| `<arch-root>` | `paths.arch` |
| `<agents-root>` | `paths.agents` |
| `<superpowers-root>` | `paths.superpowers` |
| `<backlog-root>` | `paths.backlog` |
| `<drafts-root>` | `paths.drafts` |
| `<insights-root>` | `paths.insights` |
| `<pendencias-root>` | `paths.pendencias` (opcional; default `docs/pendencias/`) |

Antes de qualquer trabalho que toque um placeholder, leia `ok-playbook.config.json` e substitua mentalmente. Se o arquivo não existir, peça pro usuário rodar `pnpm exec ok-playbook init` antes de prosseguir.

**Paths sem `<…>`** (ex.: `templates/feedback.md`, `agents/docs-review.md`, `patterns/permissions.md`) que aparecem em docs do canon são relativos ao **root do playbook** — ou seja, `<playbook-root>`, não o root do projeto consumidor. Semântica completa de cada placeholder em `<playbook-root>patterns/docs-structure.md`.

### Regras invariantes vindas do playbook

- Todo agente abre arquivo de feedback como primeira ação (ver `feedback-loop.md §6` e `agent.md §4.2`).
- Status `pending-review` só o processador (`docs-review`) muda.
- Subagentes não instalam deps, não tomam decisão arquitetural, não despacham outros subagentes (`subagent-dispatch.md §7`).
- Política de modelos para subagentes: implementer/spec=Sonnet, code-quality/final=Opus (ver bloco "Workflow superpowers" abaixo).

### Memórias persistentes deste projeto

Tipologia canônica (detalhes em `<playbook-root>patterns/memory.md`):

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

Fluxo: `brainstorming` → `writing-plans` → `subagent-driven-development` (ou `executing-plans` em sessão separada). Detalhes em `<playbook-root>patterns/superpowers-workflow.md`.

Roteamento fixo de modelos (não avaliar complexidade da task):

| Papel | Model |
|---|---|
| Sessão principal (brainstorm + plan) | Opus |
| Implementer (subagente que executa tarefas) | Sonnet |
| Spec reviewer (subagente) | Sonnet |
| Code quality reviewer (subagente) | Opus |
| Final code reviewer (subagente) | Opus |

Substitui a seção "Model Selection" do skill `subagent-driven-development` que usa linguagem vaga ("most capable", "fast cheap").

**Cadência de testes e reviews:** a canônica é a do `<playbook-root>patterns/dev-process.md` — testes por fase = **só o que a fase escreveu** (direto); suíte global **só via script do projeto** com verde de referência; teste com banco **fora do plano por padrão**; TDD não obrigatório (teste antes da entrega só em correção de bug); review de fase ao fim de cada fase + **review do conjunto como gate da entrega** (re-roda após correções, base atualizada, confirmado por escrito, prompt dirigido das oito formas).

**Não aplicar quando:** usuário pede review por task explícito; task crítica marcada (🚨); plano sem fases com menos de 5 tasks.

**Paralelismo:** sempre oferecer paralelismo quando o plano permitir. Classificar tasks como sequenciais (dependência de output) vs paralelas (arquivos disjuntos). O dispatch plan é apresentado **uma vez, para o plano inteiro, antes do primeiro dispatch** — aprovado o mapa, executar todas as fases sem novo OK, reportando entre fases. Parar só por: BLOCKED de subagente, review/teste que exige mudar plano ou spec, classificação errada de forma arriscada, ou ação destrutiva/fora de escopo. Em **fase paralela** o implementer não commita (índice do `.git` é compartilhado): entrega report com paths + mensagem, e o controller commita com `git commit -q -m "msg" --only -- <paths>` sem ler diff. Skill: `superpowers:dispatching-parallel-agents`. Em dúvida, sequencializar.

### Processo de desenvolvimento (dev-process)

Referência completa: `<playbook-root>patterns/dev-process.md`. O essencial que
vale em toda sessão:

| Fluxo | Quando | Forma |
|---|---|---|
| **Ajuste pontual** | usuário está usando e quer mudar algo | sem plano, direto, onde ele testa |
| **Funcionalidade** | trabalho novo, várias frentes | plano com fases, até a entrega |
| **Processo** | criar/consertar script | sessão separada — entregar o prompt, que **vira pendência** |
| **Correção de bug** | comportamento medível antes/depois | reproduz → corrige → regressão **antes** da entrega |

- **Gatilho de risco** (escala trabalho pequeno para o fluxo completo): (1) *se
  eu errar, desfaz sozinho?* (2) *o efeito aparece fora do que estou mudando?*
- **Entrega é no fim do plano**; parada intermediária só se acordada no gate.
  **Entrega ≠ merge: nunca mergear sem o usuário pedir** — perguntar "merge, ou
  usar na worktree?". Merge a pedido: avaliar (`git merge-tree`), `--no-ff`, sem
  rebase por reflexo.
- **Scripts de processo** (worktree, suíte global, banco de teste — o projeto
  implementa, o contrato é fixo): linha-sinal `OK`/`SUJO:`/`FALTA:` + exit code.
  Suíte global **nunca na mão**; a baseline torna a atribuição de falha fato.
  Main suja na abertura = commit pendente → o script verifica, o usuário decide.
- **Falha sem relação com o diff:** 1 linha, "não é minha", usuário decide.
- **Pendências** em `<pendencias-root>` (template `templates/pendencias.template.md`):
  um arquivo por sessão/plano, primeira coluna = área, registrar no ato. Antes de
  mexer numa área, grep pela área na pasta e avisar o usuário.
- **Sinal de atenção:** toda resposta que encerra um turno termina com
  **⏳ Nada pendente de você — `<½ linha>`** (trabalho segue / só registro) ·
  **▶ Pode testar** (só com passos acima) · **❓ Decisão: `<pergunta>`** ·
  **📖 Leia antes — `<porquê>`**. Na dúvida, o de menor atenção que seja verdadeiro.

### Registro de feedback de sessão

Toda sessão neste projeto registra fricções de forma estruturada, seguindo o padrão de `<playbook-root>patterns/feedback-loop.md`.

**Gatilho (lazy):** o arquivo de feedback é criado **somente no primeiro feedback registrado** — não no boot da sessão. Sessão sem fricção real não gera arquivo.

**Quando registrar:**
- Documentação ambígua, faltando, ou que conduziu a erro.
- Correção do usuário ao rumo da sessão.
- Padrão ou convenção do projeto que não funcionou como descrito.
- Sugestão concreta de mudança em docs ou regras.

**Onde:** `<backlog-root>/session/YYYY-MM-DD_HHmm.md`, criado a partir de `<backlog-root>/_template.md` (campo `producer: session`). `<backlog-root>` resolve via `ok-playbook.config.json`.

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

**O que `permissions-review` faz:** delega o escaneamento à skill built-in `fewer-permission-prompts`, aplica o filtro de generalização de `<playbook-root>patterns/permissions.md`, mostra diff e aplica em `settings.json` (ou `settings.local.json`) só com OK do usuário. Detalhes em `<playbook-root>agents/permissions-review.md`.

Também pode ser invocado manualmente ("revisa permissões da sessão").

Manifesto de instalação: `OKPLAYBOOK.md` no root do projeto (gerado pelo `ok-playbook init`).
