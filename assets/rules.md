## Antes de começar

Qual o modo de operação desta sessão? **dev-early**, **dev-stable** ou **review**.

Responda com o número ou nome. Se não responder, assumir **dev-early**.

Detalhes: `<playbook-root>patterns/profiles.md`. Regras git: `<playbook-root>patterns/git.md`. Permissões: `<playbook-root>patterns/permissions.md`.

---

## ok-playbook (padrões de desenvolvimento)

Este projeto foi configurado pela skill `ok-playbook`. Os patterns estão em `<playbook-root>patterns/` e os templates em `<playbook-root>templates/`. **Leia os patterns antes de qualquer trabalho de arquitetura, agentes ou subagentes:**

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

- **Agents agnósticos** (skills em `.claude/skills/`; Codex: `.agents/skills/`): `docs-review`, `new-agent`, `permissions-review`, `playbook-contribute`. Revalidar contra o canon: rode a skill `ok-playbook` no modo atualizar.
- **Templates:** `<playbook-root>templates/` — feedback, draft, insight, ARCHITECTURE, `_index`

### Regras invariantes vindas do playbook

- Todo agente abre arquivo de feedback como primeira ação (ver `feedback-loop.md §6` e `agent.md §4.2`).
- Status `pending-review` só o processador (`docs-review`) muda.
- Subagentes não instalam deps, não tomam decisão arquitetural, não despacham outros subagentes (`subagent-dispatch.md §7`).
- Política de modelos: revisão do conjunto/final sempre no modelo mais forte disponível; o resto depende de haver desk de workers (ver bloco "Workflow superpowers" abaixo).

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

Fluxo: `brainstorming` → `writing-plans` → `subagent-driven-development` (ou `executing-plans` em sessão separada, só a pedido do usuário). Detalhes em `<playbook-root>patterns/superpowers-workflow.md`.

Roteamento de modelos (detalhe em `<playbook-root>patterns/subagent-dispatch.md` §4). **Invariante: revisão do conjunto / final no modelo mais forte disponível.** Quem planeja e orquestra é a sessão aberta — sem regra de modelo.

**Sem desk de workers** — divisão por papel, sem avaliar complexidade da task:

| Papel | Model |
|---|---|
| Scout / Implementer | Sonnet |
| Revisão de fase — spec + qualidade (subagentes separados) | Sonnet |
| Revisão do conjunto / final (gate da entrega) | Opus (ou o mais forte disponível) |

**Com desk (Nidavellir — `list_workers`/`run_worker`)** — o plano distribui:

- Consultar `list_workers` e a cota das CLIs (`get_cli_usage_limits`) ao planejar; **cada task declara o worker que a implementa e o porquê** (dificuldade × capacidade do worker; cota). Worker da própria CLI → subagente nativo.
- Paralelizar o que for possível, de preferência em CLIs diferentes, para render as cotas de todas; o **orquestrador gerencia os commits** (receita de fase paralela abaixo).
- O mapa task → worker (e revisores) vai no gate único, junto com o de paralelismo; o usuário aprova ou troca. CLI perto do limite: dizer qual e quanto já foi, e propor troca.
- Revisão de fase: reviewer médio/leve, de preferência de outro fornecedor que o implementador. Revisão final: o reviewer mais forte com cota livre (CLI dele crítica → o outro forte, avisando).
- Worker que se dá mal num tipo de trabalho, ou worker melhor disponível para ele: **sugerir** troca/ajuste ao usuário no report da fase ou da entrega (não é parada nova).

Substitui a seção "Model Selection" do skill `subagent-driven-development` que usa linguagem vaga ("most capable", "fast cheap").

**Cadência de testes e reviews:** a canônica é a do `<playbook-root>patterns/dev-process.md` — testes por fase = **só o que a fase escreveu** (direto); suíte global **só via script do projeto** com verde de referência; teste com banco **fora do plano por padrão**; TDD não obrigatório (teste antes da entrega só em correção de bug); review de fase ao fim de cada fase + **review do conjunto como gate da entrega** (re-roda após correções, base atualizada, confirmado por escrito, prompt dirigido das oito formas).

**Não aplicar quando:** usuário pede review por task explícito; task crítica marcada (🚨); plano sem fases com menos de 5 tasks.

**Paralelismo:** sempre oferecer paralelismo quando o plano permitir. Classificar tasks como sequenciais (dependência de output) vs paralelas (arquivos disjuntos). O dispatch plan é apresentado **uma vez, para o plano inteiro, antes do primeiro dispatch** — aprovado o mapa, executar todas as fases sem novo OK, reportando entre fases. Parar só por: BLOCKED de subagente, review/teste que exige mudar plano ou spec, classificação errada de forma arriscada, ou ação destrutiva/fora de escopo. Em **fase paralela** o implementer não commita (índice do `.git` é compartilhado): entrega report com paths + mensagem, e o controller commita com `git add -- <paths> && git commit -q -m "msg" -- <paths>` (cobre arquivo novo; mesmo arquivo em duas tasks = sequencial) sem ler diff. Skill: `superpowers:dispatching-parallel-agents`. Em dúvida, sequencializar.

### Processo de desenvolvimento (dev-process)

Referência completa: `<playbook-root>patterns/dev-process.md`. O essencial que
vale em toda sessão:

Precedência: instrução direta do usuário > este bloco > instruções globais do usuário (ex.: `~/.claude/CLAUDE.md`) e skills genéricas, onde conflitarem.

| Fluxo | Quando | Forma |
|---|---|---|
| **Ajuste pontual** | usuário está usando e quer mudar algo | sem plano, direto, onde ele testa |
| **Funcionalidade** | trabalho novo, várias frentes | plano com fases, até a entrega |
| **Processo** | criar/consertar script | script que **surge no meio de outro trabalho**: sessão separada — entregar o prompt, que **vira pendência**. Sessão **aberta para isso** (spec + plano do script): ela mesma executa (ver "Quem planejou executa") |
| **Correção de bug** | comportamento medível antes/depois | reproduz → corrige → regressão **antes** da entrega |

- **Gatilho de risco** (escala trabalho pequeno para o fluxo completo): (1) *se
  eu errar, desfaz sozinho?* (2) *o efeito aparece fora do que estou mudando?*
- **Quem planejou executa.** A sessão que fez a spec e o plano executa o plano ela mesma, como orquestradora — quem implementa são os subagentes; o contexto do planejamento vale mais que uma janela limpa. Sessão separada para executar só quando o usuário pedir. Vale também para plano de script de processo.
- **Entrega é no fim do plano**; parada intermediária só se acordada no gate.
  Oferta de pausa em texto livre ("a menos que você queira olhar antes") é
  parada entre fases disfarçada — não fazer.
  **Entrega ≠ merge: nunca mergear sem o usuário pedir** — perguntar "merge, ou
  usar na worktree?". Merge a pedido: avaliar (`git merge-tree`), `--no-ff`, sem
  rebase por reflexo.
- **Scripts de processo** (worktree, suíte global, banco de teste — o projeto
  implementa, o contrato é fixo): linha-sinal `OK`/`SUJO:`/`FALTA:` + exit code.
  Suíte global **nunca na mão**; a baseline torna a atribuição de falha fato.
  Main suja na abertura = commit pendente → o script verifica, o usuário decide. Nunca `reset`/`stash`/`checkout --` na main — preservar é commitar (vale para o controller, não só para subagente).
- **Falha sem relação com o diff:** 1 linha, "não é minha", usuário decide.
- **Pendências** em `<pendencias-root>` (template `<playbook-root>templates/pendencias.template.md`):
  um arquivo por sessão/plano, primeira coluna = área, registrar no ato. Antes de
  mexer numa área, grep pela área na pasta e avisar o usuário.
- **Sinal de atenção:** marca a **devolução do controle**, não o fim da mensagem
  — se o trabalho segue neste mesmo turno, a mensagem termina na tool call e
  **não leva sinal** (entre fases de um plano, esse é o caso normal). Quando o
  controle volta: **⏳ Nada pendente de você — `<½ linha>`** (acabou / só
  registro, **ou** agente vivo — nunca "vou fazer X" sem tool call no mesmo
  turno) · **▶ Pode testar** (só com passos acima) · **❓ Decisão:
  `<pergunta>`** (dizer se parei ou se há agente rodando) · **📖 Leia antes —
  `<porquê>`**. Na dúvida, o de menor atenção que seja verdadeiro.
- **Bug visto durante o uso:** vira pendência, não plano na hora. **Ferramenta
  externa de CLI se prova executando** (comando + efeito observado), nunca lendo.
  **"Continua" após limite de sessão não responde pergunta pendente** — retoma até
  a pergunta e a re-apresenta; limite no meio de dispatch: redespachar do zero.

**Prompt de dispatch (todo subagente)** — detalhe em `<playbook-root>patterns/dev-process.md §5`:

- Passo zero de premissas: se o código divergir do plano, devolver BLOCKED.
- Pergunta de julgamento no fim do prompt (obrigatória).
- Exceção autorizada de escopo fechado, quando houver, vai explícita no prompt.
- Terceiro caminho: texto do plano contradiz o critério de verificação do próprio plano → seguir o critério e relatar (BLOCKED é para ambiguidade).
- **Proibido git destrutivo** (`checkout -- .`, `checkout <sha> -- <path>`, `stash`, `reset`, `restore`, `clean`, `worktree remove`): o repositório é compartilhado entre sessões.
- Não esperar teste em background: rodar em foreground com timeout ou reportar que não rodou.
- Script de prova, harness, stub ou versão antiga de arquivo (`git show <sha>:<path> >`) vai para o scratchpad, nunca para dentro do tree do repo/worktree.

### Registro de feedback de sessão

Toda sessão neste projeto registra fricções de forma estruturada, seguindo o padrão de `<playbook-root>patterns/feedback-loop.md`.

**Gatilho (lazy):** o arquivo de feedback é criado **somente no primeiro feedback registrado** — não no boot da sessão. Sessão sem fricção real não gera arquivo.

**Quando registrar:**
- Documentação ambígua, faltando, ou que conduziu a erro.
- Correção do usuário ao rumo da sessão.
- Padrão ou convenção do projeto que não funcionou como descrito.
- Sugestão concreta de mudança em docs ou regras.

**Onde:** `<backlog-root>/session/YYYY-MM-DD_HHmm.md`, criado a partir de `<backlog-root>/_template.md` (campo `producer: session`).

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

Manifesto: `ok-playbook.json` na raiz (gerado pela skill; não editar à mão).
