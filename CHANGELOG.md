# Changelog

## 1.0.1 — 2026-10-07

- `SKILL.md`: seção **"Migração de um projeto 0.x"** (M1–M6) — inventário, remoção do formato antigo por tipo (submódulo, dependência npm, cópia solta) junto com o reapontamento das referências, configuração com o que esperar no `plan`, fusão do CLAUDE.md regra a regra, provas e cuidado no merge. O Modo 1 detecta o formato antigo (passo 0) e desvia para ela.

## 1.0.0 — 2026-10-06

**Quebra de formato:** o playbook deixa de ser pacote instalado (npm/submódulo)
e vira skill que materializa o canon no projeto.

- Layout: `references/patterns`, `references/agents`, `assets/{rules.md,templates,hooks,scripts,settings-snippet.json}`, `VERSION`, `SKILL.md`.
- `scripts/ok-playbook.mjs` (plan/apply/status) + manifesto `ok-playbook.json` no projeto; substitui `ok-playbook init`, `ok-playbook.config.json` e `OKPLAYBOOK.md`.
- `playbook-audit` vira o modo atualizar/auditar da skill.
- Removidos: CLI (`bin/`, `cli/`), `INSTALL.md`, `install/claude-md-snippet.md`, schema do config.
- Processo: receita de commit paralelo com `git add` (cobre arquivo novo); contrato do banco de teste (nunca cria, um por checkout, criação só com sim isolado); troca de estratégia em review em loop; decisões pendentes `⟂` no plano; revisor de spec recebe a spec; teste por resultado, não contagem. `worktree.mjs`: commit de abertura com `.worktrees/` ignorado, linha-sinal em todo caminho.
- `worktree.mjs` de referência com `SUJO:` e `--commit-abertura`.
- Hooks: `settings-snippet.json` aponta para `.mjs` e registra também o hook de PowerShell.
- Licença MIT.
- Quem planejou executa; fluxo Processo distingue script que surge no meio de outro trabalho.
- Hook: PROJETO em tempo de execução (CLAUDE_PROJECT_DIR), sobe da worktree para a raiz.
- Política de modelos alinhada: revisão de fase (spec + qualidade) = Sonnet; revisão do conjunto/final = Opus.

### Migração de projetos 0.x
Ver `SKILL.md`, seção "Migração de um projeto 0.x" (desde 1.0.1).

## 0.5.0 (2026-09-04)

**O sinal de atenção passa a marcar a devolução do controle, não o fim da
mensagem** (`patterns/dev-process.md` §10/§12/§13, `install/claude-md-include.md`).
A 0.4.1 criou o ⏳ para absorver as mensagens de meio de fase — e com isso deu
nome aprovado ao encerramento de turno com trabalho pendente: o agente escrevia
*"⏳ Nada pendente — Task 5b é a próxima"* sem nenhuma tool call e parava, e o
usuário respondia *"parou?"*. O anúncio da intenção substituía a ação.

### Mudanças
- **Gatilho** — o sinal é a última coisa escrita antes de o usuário falar de
  novo. Trabalho que continua no mesmo turno termina **na tool call, sem sinal**;
  ausência de sinal significa "ainda trabalhando". Entre fases de um plano esse
  passa a ser o caso normal.
- **⏳ redefinido** — significa literalmente o rótulo: o controle voltou e não há
  nada para o usuário. Dois casos fechados: o trabalho terminou ou foi só
  registro; ou há agente/comando vivo seguindo sem ele. Deixa de significar
  "trabalho segue".
- **Trava do ⏳** — só é emitível com tool call no mesmo turno ou agente vivo;
  sem nenhum dos dois e com trabalho pendente, é proibido. Verbo em 1ª pessoa no
  futuro como última prosa do turno exige tool call correspondente.
- **❓ Decisão** — passa a exigir dizer no corpo se parou de verdade ou se há
  agente rodando.
- **§12** — o item de checklist dizia "última linha de **cada** resposta (MUST)",
  contradizendo o §10 desde a 0.4.0. Era a formulação mais forte do conjunto e a
  que produzia a injeção indiscriminada. Reescrito.
- **§13** — novo anti-padrão: ⏳ anunciando a etapa seguinte sem despachá-la no
  mesmo turno.

### Adoção
Consumidores precisam atualizar o bloco do sinal no próprio `CLAUDE.md` — o
include novo não substitui texto já copiado para lá.

## 0.4.2 (2026-08-20)

O `init` passa a **scaffoldar `<pendencias-root>`** — a 0.4.0 publicou o
placeholder no schema/docs mas o CLI não o conhecia: `pnpm add` + `init` num
projeto instalado deixava o pattern apontando para pasta inexistente.

### Mudanças
- **`cli/lib/paths.mjs`** — `pendencias: "docs/pendencias/"` nos defaults.
- **`cli/lib/config.mjs`** — `readConfig` preenche em memória os paths
  **opcionais** ausentes (hoje só `pendencias`): config anterior a 0.4 continua
  válido e o `init` scaffolda a pasta nova **sem `--force`** e sem reescrever o
  config do consumidor.
- **`cli/lib/folders.mjs`** — copia `templates/pendencias.template.md` para
  `<pendencias-root>/_template.md` (só se ausente, como os demais).
- Testes: 29 casos (3 novos), mais prova por execução: `init` num projeto com
  config 0.3 cria a pasta e preserva o config.

## 0.4.1 (2026-08-20)

Correção do sinal de atenção (`dev-process.md §10`, `claude-md-include.md`):
com três formas, **"▶ Pode testar" virou o sinal de "terminei algo"** — apareceu
no meio de fases e em respostas só de docs, porque não havia forma para o caso
mais comum de um plano em andamento. Entra a quarta: **⏳ Nada pendente de você
— `<meia linha>`** ("fase 2 concluída, seguindo" / "só registros"). "Pode
testar" passa a exigir passos concretos logo acima. Regra de desempate: na
dúvida, o sinal de **menor** atenção que ainda seja verdadeiro.

## 0.4.0 (2026-08-20)

O processo de trabalho vira canon: **`patterns/dev-process.md`**, destilado de um
dossiê de 7 execuções reais (~134 erros de plano catalogados; a hipótese "o plano
erra na costura" foi refutada — costura era 27% dos erros e 1 de ~19 críticos)
mais uma rodada de 4 sessões operando o processo (tempo ativo 1h28–4h16 contra
8–11h de relógio). Cada regra carrega o caso medido que a paga.

### Mudanças
- **`patterns/dev-process.md`** (novo) — quatro fluxos por tipo de solicitação
  (ajuste pontual / funcionalidade / processo / bug) + gatilho de risco de duas
  perguntas; escrita do plano (o planejador **abre o que o plano toca** — erro de
  costura mora na fronteira do não-lido); execução (entrega no fim do plano;
  teste só do que a fase escreveu; suíte global **só via script** com baseline;
  teste com banco fora por padrão; TDD não obrigatório); **review do conjunto
  como gate da entrega** com prompt dirigido das oito formas de defeito
  invisíveis por fase (achou o crítico em 7 de 7) + regras de frescor; prompt de
  dispatch (passo zero, pergunta de julgamento obrigatória, divergir-e-relatar,
  proibições fixas de git destrutivo/espera em background/artefato no tree);
  estado da main (`SUJO:`/commit de abertura — main suja é commit pendente);
  contrato `OK`/`SUJO:`/`FALTA:` dos scripts de processo; **entrega ≠ merge**
  (merge só a pedido, avaliado, sem rebase por reflexo); `<pendencias-root>`;
  **sinal de atenção** (▶/❓/📖 na última linha de toda resposta); limite de
  sessão ("continua" não responde pergunta pendente).
- **`templates/pendencias.template.md`** (novo) — pendência ≠ insight; um
  arquivo por sessão/plano, primeira coluna = área, registro no ato.
- **`patterns/docs-structure.md`** + **`install/ok-playbook.config.schema.json`**
  — `<pendencias-root>` no layout e no schema (`paths.pendencias`, **opcional**:
  instalações existentes seguem válidas).
- **`patterns/superpowers-workflow.md`** — roteamento por **papel** (modelos são
  o mapeamento atual, configurável por projeto; o invariante é a assimetria);
  cadência de testes/reviews aponta para o dev-process.
- **`patterns/subagent-dispatch.md`** — §6.1 o gatilho da discovery deixa de ser
  "spec veio de fora" e vira "o plano cita o que não foi aberto nesta sessão";
  §6.3 prompt do subagente completo (passo zero, julgamento, exceção autorizada,
  divergir-e-relatar, proibições fixas); §11 review do conjunto vira MUST-gate e
  "nenhum merge sem pedido" entra no checklist.
- **`install/claude-md-include.md`** — seção "Processo de desenvolvimento
  (dev-process)" com o essencial que vale em toda sessão dos consumidores.

## 0.3.0 (2026-08-01)

Prompt de permissão constante: a causa era **formato de comando**, não falta de regra. Diagnóstico feito no Ariadne, medido de forma independente no Igris, e portado pra cá. Cobertura do hook: **8,7% → 95%** (Igris).

### Mudanças
- **`install/scripts/worktree.mjs`** (novo) — `new` / `close` / `list` com as pegadinhas resolvidas: colisão de branch entre sessões paralelas (aborta com mensagem clara), untracked que não atravessa (`.env` por config, plano por `--plano` — sem ele o implementer despachado improvisa), deps pela estratégia do projeto, e **cleanup junction-safe** (remove todo link com `rmdir` antes de tocar na worktree; delete recursivo no Windows segue o reparse point e apaga o `node_modules` da main). A branch do `close` é lida da própria worktree, **não deduzida do nome** — deduzir fazia `git log base..branch` apontar pra ref inexistente e a checagem de commits não-mergeados **passar em silêncio**, a pior falha possível num comando destrutivo (caso real: worktree `operacoes-assincronas` estava em `feat/operacoes-assincronas-fase-3`). Extensível por `worktree.config.mjs` no root.
- **`README.md` / `INSTALL.md` — instalação passa a HTTPS, e a URL de SSH estava quebrada.** O comando documentado era `git+ssh://git@github.com:PatrickCavalcanti/…`: além de exigir chave SSH configurada, é **URL malformada** — com o esquema `git+ssh://` o separador precisa ser `/`, o `:` só vale na forma scp-style *sem* esquema. Canon agora é `git+https://` (o Git Credential Manager já está autenticado, zero setup). INSTALL ganhou §"Atualizando a versão" completa: o que o `init` **não** atualiza (as peças copiadas — `.claude/hooks/`, skills, profiles — cuja omissão deixa o projeto com versão nova no manifesto e comportamento antigo) e a ordem correta com vários consumidores (atualizar todos → só então auditar; auditar no meio mistura "desatualizado" com "divergiu de propósito").
- **`patterns/command-forms.md`** (novo) — **a forma canônica de cada ação**. Ataca a causa em vez do sintoma: toda ação tem cinco formas de ser escrita e o agente escolhe livremente a cada chamada, então nenhum allowlist cobre. Reduzir as formas resolve; caçar variantes não. Curto de propósito (uma tela), referenciado pelo snippet de CLAUDE.md pra estar em contexto toda sessão. Cobre onde rodar, ler/escrever arquivo, shell (incluindo a pegadinha de estado que não persiste entre chamadas), worktree/destrutivo e projeto irmão.
- **`install/hooks/auto-approve-project-powershell.mjs`** (novo) + **`install/hooks/lib/areas.mjs`** (novo) — em máquina Windows a tool PowerShell é **17,1% de todo o shell** e sofre a MESMA doença: **56% das chamadas começam com `Set-Location`/`cd`**, e atribuição (`$x = (Select-String …)`) esconde o cmdlet do matcher. Cobertura medida: **~0% → 84,9%**. O parser de PS é mais simples (não há `&&`/`||`; a convenção Verbo-Substantivo classifica leitura por construção), mas precisa resolver variáveis literais (`$root = "E:\…"`) e listar explicitamente escrita/remoção — `New-Object` é inerte e `New-Item` escreve. Chamada estática .NET (`[System.IO.Directory]::Delete`) nunca é auto-aprovada. **A política agora é única** em `lib/areas.mjs`, compartilhada pelos dois hooks; só o parser é por shell.
- **Hooks passam a `.mjs`** — ESM independente do `type` do `package.json`, o que elimina a pegadinha nº 1 do diagnóstico original (`require` não existe em type:module).
- **`install/hooks/auto-approve-project-bash.mjs`** (renomeado de `auto-approve-worktree-bash.js`) — reescrito. Cobre o **root do projeto** (onde está a maioria das chamadas: 648×214 no Igris), aprova comando **sem `cd`** usando o `cwd` do payload, valida a **chain inteira** (`&&`, `||`, `;`, `|`, newline — a versão antiga só olhava `&&`, então `git status; rm -rf ~` era auto-aprovado), split respeita aspas e `$( )`, substituição de comando é validada recursivamente, paths são canonicalizados antes de comparar (resolve `..`, normaliza formas do SO — antes `cd <projeto>/../../evil` passava como "dentro do projeto"), e **destino de escrita é validado** (antes `cp x ~/.claude/settings.json` passava porque o head era `cp`). Quatro áreas com políticas distintas: worktree (destrutivo livre), root (sem destrutivo), scratch (escrita livre), projetos irmãos (**só leitura**).
- **`install/hooks/tools/`** (novo) — `medir-comandos.mjs` (passo 1: mede o formato dos comandos e os heads reais), `hook-test.mjs` (suite de casos; os negativos são o que impede o hook de virar um `allow *`), `hook-replay.mjs` (cobertura real contra o histórico de transcripts, com `--porques`). Genéricos: rodam em qualquer projeto sem edição.
- **`patterns/permissions.md`** — §"Quando rules não bastam" reescrita: medir antes de editar allowlist; `cd <root>` é o formato dominante (não só worktree); **rules não recarregam mid-sessão mas hooks sim** (é isso que faz um conserto correto parecer que falhou); o whitelist do hook **espelha as rules** (e errar pro lado restrito custa prompt, não bloqueio — o hook nunca nega); **a lista de "nunca" mora em `permissions.deny`**, não na ausência de `allow`; quatro áreas; roteiro de diagnóstico de 5 passos.
- **`patterns/worktree.md`** §6.2/§6.4/§10/§11 — hook deixa de ser "de worktree"; política de git destrutivo por escopo; anti-padrões novos (empilhar rules sem medir, validar só `&&`, comparar path por substring, validar head sem destino, confiar na ausência de `allow`, dar escrita a projeto irmão).
- **`patterns/subagent-dispatch.md`** §6.3 — **passar o diretório de trabalho em texto, não como `cd` no comando**. O cwd do Bash tool persiste; um prompt de subagente que ensina o formato errado reproduz a fricção em cada task despachada.
- **`install/permissions-snippet.json`** — ganhou bloco `deny`; `Bash(rm *)` e `Bash(mv *)` **removidos** (aprovavam `rm -rf src` no root e anulavam a política de destrutivos).
- **`agents/permissions-review.md`** — reconhece root além de worktree, e passa a exigir medição antes de propor entradas.

## 0.2.1 (2026-05-29)

Correção de template + documentação de instalação/atualização.

### Mudanças
- **`templates/_index.template.md`** — os 9 paths hardcoded `packages/ok-playbook/` viraram placeholder `<playbook-root>`. Como o `init` copia o template verbatim, o path fixo gerava links quebrados no `_index.md` scaffoldado para consumidores que instalam via `node_modules/ok-playbook` (layout canônico). A linha 7 também perdeu o prefixo `../../` espúrio.
- **`README.md` / `INSTALL.md`** — a instalação rápida passa a referenciar a última tag publicada (`v0.2.1`); a seção de atualização foi corrigida (dep git pinada em tag **não** sobe de versão com `pnpm up` — atualizar = trocar a tag) e ganhou o passo de verificação (`playbook-audit`).

## 0.2.0 (2026-05-29)

Correções de worktree/permissões a partir de fricções reais em projetos consumidores (pnpm + junction, Windows). (Plugin/shim de skills/profiles permanece fora deste release — segue como trabalho futuro.)

### Mudanças
- **`patterns/worktree.md` §5.2 — estratégia de dependências por gerenciador/tipo de projeto.** Strategy B (install real) passa a ser o **default para pnpm e para single-package**; Strategy A (junction) fica reservada a monorepo npm/yarn com libs locais não-compiladas. Documentado que **pnpm + junction não funciona e é perigoso** (`verify-deps-before-run` tenta purgar o node_modules; pode corromper o checkout principal).
- **`patterns/worktree.md` §5.3/§9/§11** — pegadinhas novas (pnpm purge; mklink relativo frágil → usar path absoluto), ordem segura de cleanup no Windows (remover junction com `rmdir` antes de `git worktree remove`; nunca `rm -rf` sobre junction), e checklist de estratégia por gerenciador.
- **`install/hooks/auto-approve-worktree-bash.js`** — adicionada a função `commandBasename()` (faz `node_modules/.bin/<bin>` casar a whitelist — essencial porque `pnpm exec` quebra em worktree) e a whitelist default ganhou `vitest, vite, eslint, prettier, ok-bridge, drizzle-kit`.
- **`agents/permissions-review.md`** — escopo ampliado: reconhece a whitelist do hook de worktree como alvo de modificação quando os prompts vêm de dentro de `.worktrees/` (compounds `cd && cmd` não casam em `permissions.allow`).
- **`patterns/feedback-loop.md` §8.6/§10** — roteamento obrigatório: feedback cujo alvo é doc do PLAYBOOK vai pra `playbook-contribute` (não editar o canon read-only localmente) e fica pendente até subir upstream; encerramento lista pendências antigas por nome (anti-evaporação).
- **`INSTALL.md`** — passo de decisão "tipo de projeto + estratégia de worktree" + customização da whitelist do hook por projeto.

### Conhecido (próximos)
- Detecção automática de monorepo + recomendação de estratégia de worktree no `ok-playbook init` (hoje a decisão é manual via INSTALL.md). Requer design de interatividade (init é não-interativo no 0.1.x).

## 0.1.0 (2026-05-27)

MVP "consumível" do ok-playbook.

### Mudanças
- Pacote agora é instalável via git tag (`pnpm add git+ssh://...ok-playbook#v0.1.0`).
- CLI `ok-playbook init` substitui o protocolo manual de `INSTALL.md`.
- Include estável em `install/claude-md-include.md` referenciado via `@node_modules/ok-playbook/...`; placeholders não são mais substituídos no install, são resolvidos em runtime via `ok-playbook.config.json`.
- Init não pergunta modo de contribuição. `playbook-contribute` continua perguntando quando invocado com `contribution: unknown`.

### Conhecido (out of scope para 0.1.0)
- Skills, hooks, profiles, `git-rules.md` ainda precisam de cópia manual no consumidor — virarão plugin/shim em 0.2.
- `ok-playbook doctor`/`migrate` ainda não existem.
- Modo `external` de contribuição (gerar issue upstream) ainda não implementado.
