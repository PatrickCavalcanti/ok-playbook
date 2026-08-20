# ok-playbook

> 🚧 **Em construção incremental.** Estrutura inicial montada; conteúdo migrado a partir de `docs/project-architecture/ok-design-architecture/` do Igris (primeiro consumidor formal). Será refinado em iterações, projeto a projeto.

## Instalação rápida

```bash
pnpm add git+https://github.com/PatrickCavalcanti/ok-playbook.git#v0.4.2
pnpm exec ok-playbook init
```

> Use sempre a **última tag publicada** (hoje `v0.4.2`) — confira em [tags](https://github.com/PatrickCavalcanti/ok-playbook/tags).

### Atualizando uma instalação existente

A dependência é pinada numa tag git, então `pnpm up` **não cruza versões** (a tag é fixa). Atualizar é trocar a tag:

```bash
pnpm add git+https://github.com/PatrickCavalcanti/ok-playbook.git#<nova-tag>
pnpm exec ok-playbook init   # idempotente — só atualiza o que mudou
```

**Use HTTPS**, não SSH: o Git Credential Manager já está autenticado e não exige setup.

⚠️ **`init` não atualiza as peças copiadas** — `.claude/hooks/` (com `lib/` e `tools/`), skills, profiles e git-rules são cópias e precisam ser recopiadas à mão, com a parametrização reaplicada. Pular isso deixa o projeto com versão nova no manifesto e comportamento antigo.

Com **vários consumidores**: atualize todos primeiro e **só então** rode a auditoria — peça "**revalida o ok-playbook**" ([`playbook-audit`](agents/playbook-audit.md)) em cada um. Auditar no meio da migração mistura "desatualizado" com "divergiu de propósito".

Procedimento completo em [`INSTALL.md §Atualizando a versão`](./INSTALL.md).

## O que é

`ok-playbook` é o **canon vivo** de padrões da OK para:

- arquitetura de software, e
- colaboração humano↔IA durante o desenvolvimento.

A motivação: até hoje, padrões de arquitetura, convenções de skills, workflows de agentes e regras operacionais foram **copiados e colados** entre os projetos da OK. Isso quebra a melhoria contínua — uma evolução feita no projeto A nunca chega no projeto B.

Este repositório é a fonte única dessa documentação. Projetos consomem como submódulo + workspace package.

## Estrutura

```
ok-playbook/
├── README.md                        # este arquivo
├── INSTALL.md                       # protocolo de instalação no projeto consumidor (§)
├── patterns/                        # princípios agnósticos
│   ├── code-design.md               # 5 camadas, naming, fractal, ARCHITECTURE.md
│   ├── worktree.md                  # quando criar worktree, permissões Claude Code
│   ├── feedback-loop.md             # ciclo produtor → backlog → processador (lazy)
│   ├── agent.md                     # quando criar agente, anatomia, trio canônico
│   ├── subagent-dispatch.md         # política de modelos, granularidade, isolamento
│   ├── git.md                       # convenções de branches, commits, bloqueados
│   ├── profiles.md                  # modos de operação canônicos (dev-early/stable/review)
│   ├── permissions.md               # filosofia de .claude/settings.json
│   ├── command-forms.md             # forma canônica de cada ação (reduz variedade → menos prompt)
│   ├── memory.md                    # tipologia de memórias persistentes do projeto
│   └── superpowers-workflow.md      # fluxo superpowers + roteamento Opus/Sonnet
├── agents/                          # protocolos agnósticos de agentes
│   ├── docs-review.md               # processador de feedback (consome feedback-loop)
│   ├── new-agent.md                 # materializador de novos agentes
│   ├── playbook-audit.md            # revalida o projeto contra a versão atual do playbook (manual)
│   ├── permissions-review.md        # revisa prompts de permissão repetidos e propõe allowlist (lazy)
│   └── playbook-contribute.md       # propõe mudança upstream pro playbook (direct/branch-pr/request)
├── templates/                       # templates de artefatos
│   ├── feedback.md                  # template do registro de feedback
│   ├── draft.md                     # template de rascunho de novo agente
│   ├── insight.md                   # template de insight de evolução
│   ├── upstream-proposal.md         # template de proposta upstream pro playbook
│   └── ARCHITECTURE.md              # template para ARCHITECTURE.md de unidades
└── install/                         # snippets e templates do instalador
    ├── claude-md-snippet.md         # bloco a inserir no CLAUDE.md do consumidor
    ├── permissions-snippet.json     # permissões path-agnostic + bloco hooks pra .claude/settings.json
    ├── okplaybook-template.md       # template do manifesto OKPLAYBOOK.md
    ├── scripts/                     # scripts operacionais
    │   └── worktree.mjs             # criar/fechar worktree (colisão, untracked, junction-safe)
    └── hooks/                       # templates de PreToolUse hooks
        ├── auto-approve-project-bash.mjs        # hook de auto-approve (Bash)
        ├── auto-approve-project-powershell.mjs  # idem, PowerShell (~17% das chamadas no Windows)
        ├── lib/areas.mjs                        # política única: áreas, paths, comandos nativos
        └── tools/                               # medir-comandos, hook-test(-powershell), hook-replay
```

## Como começar — leitura recomendada

A ordem de dependência conceitual:

1. [`patterns/code-design.md`](patterns/code-design.md) — princípios de estruturação de código (pai filosófico).
2. [`patterns/feedback-loop.md`](patterns/feedback-loop.md) — ciclo agnóstico de feedback (lazy).
3. [`patterns/agent.md`](patterns/agent.md) — consome o feedback-loop; define o que é "agente".
4. [`patterns/worktree.md`](patterns/worktree.md) — isolamento físico do trabalho.
5. [`patterns/subagent-dispatch.md`](patterns/subagent-dispatch.md) — orquestração de subagentes.
6. [`patterns/git.md`](patterns/git.md) — convenções git compartilhadas.
7. [`patterns/profiles.md`](patterns/profiles.md) — modo da sessão (escolhido no boot).
8. [`patterns/permissions.md`](patterns/permissions.md) — filosofia das permissões `.claude/settings.json`.
9. [`patterns/memory.md`](patterns/memory.md) — tipologia de memórias persistentes do projeto.
10. [`patterns/superpowers-workflow.md`](patterns/superpowers-workflow.md) — workflow superpowers + roteamento de modelos.

Os agentes em [`agents/`](agents/) são implementações concretas dos papéis canônicos definidos em `feedback-loop.md` e `agent.md`:

- [`docs-review`](agents/docs-review.md) — processador padrão do backlog de feedback; **oferece** promoção upstream pro playbook quando processa insight genérico.
- [`new-agent`](agents/new-agent.md) — materializa rascunhos aprovados em agentes oficiais.
- [`playbook-audit`](agents/playbook-audit.md) — **revalidação manual** do projeto contra a versão atual do playbook (downstream: playbook → projeto).
- [`permissions-review`](agents/permissions-review.md) — disparado **lazy** no encerramento da sessão quando há prompts de permissão repetidos; delega o escaneamento à skill built-in `fewer-permission-prompts` e aplica o filtro de generalização do [`patterns/permissions.md`](patterns/permissions.md).
- [`playbook-contribute`](agents/playbook-contribute.md) — propõe mudança **upstream** pro playbook em três modos (`direct` / `branch-pr` / `request`) conforme registrado em `OKPLAYBOOK.md`. Invocação manual ou oferecida pelo `docs-review`.

## Como é consumido

A partir de v0.1.0, projetos externos consomem o playbook como dependência npm-style (não mais por cópia/vendoring). Veja [`INSTALL.md`](./INSTALL.md) para o caminho rápido:

```bash
pnpm add git+https://github.com/PatrickCavalcanti/ok-playbook.git#v0.4.2
pnpm exec ok-playbook init
```

`init` é **não-interativo** e **idempotente** — escreve `ok-playbook.config.json` com paths default, anexa um include estável no `CLAUDE.md`, mescla permissões em `.claude/settings.json`, scaffolda as pastas de backlog/drafts/insights/superpowers/arch, e gera `OKPLAYBOOK.md` (manifesto da instalação).

`OKPLAYBOOK.md` é o **registro de auditoria** — qual versão foi instalada, paths customizados, próximos passos manuais (ver seção "O que ainda precisa ser feito manualmente" em `INSTALL.md` enquanto MVP).

Para atualizar, troque a tag git e re-rode o init — e **recopie as peças manuais** (hooks, skills, profiles), que o `init` não atualiza. Procedimento completo em [`INSTALL.md §Atualizando a versão`](./INSTALL.md) e resumo em [Atualizando uma instalação existente](#atualizando-uma-instalação-existente).

### Modo monorepo / workspace interno

Para projetos que mantêm o playbook como submódulo + workspace package (caso do Igris, primeiro consumidor formal), o flow é o mesmo — `node_modules/ok-playbook/` resolve via pnpm workspace pra `packages/ok-playbook/`, e `pnpm exec ok-playbook init` funciona idem.

## Como contribuir

Edições normalmente acontecem **dentro de um monorepo consumidor** (é onde está o contexto da mudança). O **modo de contribuição** está registrado em `OKPLAYBOOK.md` do consumidor (campo "Modo de contribuição upstream") e determina como o fluxo opera. O agente [`playbook-contribute`](agents/playbook-contribute.md) automatiza os três:

### Modo `direct` — mantenedor com push na main

```bash
cd packages/ok-playbook
# editar arquivos
git add .
git commit -m "..."
git push origin main

# voltar pro super-repo e commitar a referência atualizada do submódulo
cd ../..
git add packages/ok-playbook
git commit -m "chore: bump ok-playbook"
```

### Modo `branch-pr` — git access, sem push na main (default pra times)

```bash
cd packages/ok-playbook
git checkout -b proposal/<slug>
# editar arquivos
git add .
git commit -m "..."
git push -u origin proposal/<slug>
gh pr create --title "..." --body "<inclui insight de origem completo + diff + como validar>"
```

O PR body **precisa** embutir o insight de origem completo (mantenedor não tem acesso ao repo consumidor). Não bumpar a referência do submódulo no super-repo até o merge.

### Modo `request` — sem git access ao playbook

Nada é commitado no submódulo. O agente gera um artefato em `<insights-root>/upstream-proposals/YYYY-MM-DD-<slug>.md` a partir de [`templates/upstream-proposal.md`](templates/upstream-proposal.md) com diff + steps executáveis pelo mantenedor + insight de origem. Consumidor envia pelo canal combinado. Quando o mantenedor confirmar merge: `git submodule update --remote packages/ok-playbook` e `playbook-audit`.

### Rastro local em todos os modos

Toda proposta upstream — independente do modo — gera arquivo de rastro em `<insights-root>/upstream-proposals/`. Permite auditoria de "o que esse projeto promoveu pro playbook ao longo do tempo".

⚠️ **Pegadinha clássica** (apenas `direct`): se você commitar a referência do submódulo no super-repo **sem ter pushado** o commit do submódulo, outros consumidores não vão conseguir clonar/buildar. Sempre push o submódulo primeiro.

## Status atual

| Componente | Estado |
|---|---|
| Patterns originais (code-design, worktree, feedback-loop, agent, subagent-dispatch) | ✅ migrados |
| Patterns config harness (git, profiles, permissions) | ✅ extraídos; permissions ganhou seção sobre PreToolUse hooks como escape hatch |
| Hook canônico de permissões (`install/hooks/`, Bash + PowerShell) | ✅ — substitui ~100 rules verbosas por 1 script; cobre root + worktree + scratch + projetos irmãos; 95% de cobertura medida |
| Patterns adicionais project-level (memory, superpowers-workflow) | ✅ extraídos |
| Agents (docs-review, new-agent, playbook-audit, permissions-review, playbook-contribute) | ✅ — feedback-loop lazy; playbook-audit manual; permissions-review lazy no encerramento; playbook-contribute manual com 3 modos |
| Templates (5: feedback, draft, insight, ARCHITECTURE, upstream-proposal) | ✅ migrados |
| `INSTALL.md` + snippets project-level | ✅ esqueleto pronto — falta validar contra instalação real |
| Agentes Igris-específicos (power, module, session-review) | ⏳ não migrados — domínio muito Igris; aguardam extração de versão agnóstica |

### Próximos passos previstos

- Review completo dos arquivos migrados pra remover qualquer resíduo Igris-específico (paths absolutos, nomenclatura de domínio).
- Primeiro install end-to-end num projeto consumidor real (validar o INSTALL.md).
- Decidir se outros partners agnósticos merecem ser extraídos (candidatos: `docs-architecture-partners`, `unit-architecture-doc-partners`).
- Extrair versões agnósticas dos agentes de domínio (power, module, session-review) quando o padrão estabilizar em 2+ projetos.

## Princípios para evolução

1. **Agnóstico de projeto** — se algo só faz sentido para um produto específico, não pertence a este repositório.
2. **Doc primeiro, código depois** — neste momento o playbook é majoritariamente markdown. CLI, scripts e templates executáveis vêm depois, quando houver demanda real.
3. **Navegável** — quem chega aqui (humano ou agente) precisa encontrar o que procura em poucos cliques.
4. **Linkável e estável** — projetos vão referenciar arquivos específicos deste repo; paths devem mudar o mínimo possível.
5. **Construção incremental** — refinar conforme uso em projetos novos descobre lacunas; não tentar prever tudo de cara.

## Mantenedor

Patrick Cavalcanti (OK)
