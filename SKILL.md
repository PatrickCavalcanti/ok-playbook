---
name: ok-playbook
description: "Configura um projeto com o processo de desenvolvimento do ok-playbook (regras para CLAUDE.md/AGENTS.md, protocolos docs-review/new-agent/permissions-review/playbook-contribute, patterns, templates, hooks) e mantém o projeto alinhado ao canon. Também leva mudanças do projeto de volta ao playbook."
when_to_use: "explicar o que o ok-playbook faz num projeto ('o que o ok-playbook configura?', 'explica o playbook'); configurar o ok-playbook num projeto; migrar um projeto que usa o formato antigo (submódulo, dependência npm ou cópia do ok-playbook) — só a pedido explícito; atualizar/auditar um projeto já configurado contra o canon ('revalida o playbook', 'audita drift'); propor mudança no playbook a partir de insight/feedback do projeto ('sobe isso pro playbook')"
---

# ok-playbook

Esta skill **materializa** o canon no projeto: depois de configurado, o projeto
é autocontido (Claude Code e Codex leem tudo dele, sem esta skill instalada).
A parte mecânica é do script; o julgamento é seu.

`SKILL_DIR` = o diretório deste arquivo. Script: `node "<SKILL_DIR>/scripts/ok-playbook.mjs" <plan|apply|status> --projeto <raiz>`.
Última linha: `OK …` (0) ou `FALTA: …` (1). Leia a linha-sinal; não interprete saída longa.

Flags (todas recebem um valor; listas separadas por vírgula, sem espaço):
`--so <ids>` escreve o item mesmo em conflito/edição · `--manter <ids>` mantém a
versão local e registra como `customizado` · `--sem <ids>` não usa o item ·
`--do-projeto <paths>` registra script que o projeto implementa (o arquivo
precisa existir).

Id desconhecido em `--so/--manter/--sem` → `FALTA: id desconhecido` sem escrever nada (`settings` só vale em `--sem`).

Ids de item (a 2ª coluna do `plan`): `regras:CLAUDE.md`, `regras:AGENTS.md`,
`skill:.claude/skills/<nome>`, `skill:.agents/skills/<nome>`, `pattern:<arquivo>`,
`template:<arquivo>`, `hook:<caminho relativo a assets/hooks, ex.: lib/areas.mjs>`,
`semente:<chave de paths>` (template inicial, só se ausente).

Linhas do `plan`/`apply` (`<classe>␉<id>␉<destino>`):
`novo`, `igual`, `atualizavel` (escritos sem perguntar) · `customizado`, `excluido`,
`do-projeto` (nada a fazer) · **pedem decisão**: `conflito`, `editado`,
`customizado-canon-mudou`, `orfao`, `do-projeto-ausente`, `marcador-quebrado`.

## Modo 1 — Configurar (projeto sem `ok-playbook.json`)

0. **Formato antigo?** Se o projeto tem o marcador `<!-- ok-playbook:include:start -->` no CLAUDE.md, `ok-playbook.config.json`, `OKPLAYBOOK.md`, dependência `ok-playbook` no `package.json`, submódulo ou pasta `packages/ok-playbook`, ou skills que apontam para `…/ok-playbook/agents/` → é migração: siga **"Migração de um projeto 0.x"** abaixo, que usa os passos deste modo no meio.
1. Confirme a raiz do projeto (git root) e que a árvore está limpa (`git status --short`). Suja → pergunte ao dono se commita antes.
1a. **Apresente o que muda.** Leia `<SKILL_DIR>/references/patterns/visao-geral.md` e resuma ao dono, em poucas linhas por seção, o que passa a existir no projeto, como o agente passa a se comportar (toda sessão, trabalho com spec e plano, desk de workers se ele usa um) e o que mexe na máquina (hooks, permissões). Pergunte se algo deve ficar de fora; cada recusa vira `--sem <id>` no `apply` (passo 7) ou regra editada no bloco + `--manter regras:CLAUDE.md`. Não pule este passo em projeto de outra pessoa — é o único momento em que ela vê o conjunto antes de valer.
2. Proponha os caminhos com os defaults abaixo, ajustados ao que já existe no projeto (procure pastas de docs, feedback, pendências). Pergunte só o que o projeto não responde.
   `docs` `docs/` · `arch` `docs/project-architecture/` · `agents` `docs/project-architecture/agents/` · `superpowers` `docs/superpowers/` · `backlog` `docs/agent-feedback/` · `drafts` `docs/_drafts/` · `insights` `docs/insights/` · `pendencias` `docs/pendencias/`
3. Grave `ok-playbook.json` com `{ "paths": { … }, "contribuicao": "<modo>" }` — `direct` se o dono mantém o playbook (o clone da skill tem push na main); senão `request` (contribuições viram issue; `branch-pr` se ele prefere mandar PR). O script exige que o arquivo exista; chaves omitidas em `paths` recebem o default acima.
4. Rode `plan`. Para cada linha:
   - `novo` / `atualizavel` — será escrito.
   - `conflito` (arquivo já existe, diferente do canon e sem registro) — mostre a diferença ao dono e decida: sobrescrever (`--so <id>`), manter a versão local (`--manter <id>`), ou não usar o item (`--sem <id>`). Em `regras:CLAUDE.md`/`regras:AGENTS.md` o arquivo existente do projeto nunca é conflito: o bloco é inserido no topo e o resto fica intocado (um bloco legado `ok-playbook:include` é substituído).
5. Scripts de processo (`references/patterns/dev-process.md §7`): para cada verbo (worktree, suíte global, banco de teste), se o projeto já tem um script que cumpre o contrato, registre com `--do-projeto <path>`. Se não tem: worktree → copie `<SKILL_DIR>/assets/scripts/worktree.mjs` para `scripts/`, adapte ao gerenciador de pacotes do projeto e só então registre com `--do-projeto` (o arquivo precisa existir, senão aparece `do-projeto-ausente`); suíte e banco → **não escreva agora**: registre uma linha em `<pendencias>` com o contrato do verbo (§7) para uma sessão separada. Em seguida escreva no `CLAUDE.md` (e no `AGENTS.md`), **fora do bloco**, numa seção "Complementos do <projeto> ao processo", uma tabela curta dos verbos: o comando de cada um e, para os que faltam, o que fazer enquanto não existem (ex.: testar só o que a fase escreveu e reportar que a suíte não rodou). Sem isso, o bloco manda usar scripts que a sessão não sabe chamar.
6. Hooks (`.claude/hooks/`): são materializados idênticos em qualquer checkout (a raiz do projeto é calculada em tempo de execução, via `CLAUDE_PROJECT_DIR`). **Não edite o `areas.mjs`**: as áreas do projeto vão em `.claude/hooks/areas.local.json` (`{ "scratch": [...], "leitura": [...], "headsProjeto": [...] }`, todas opcionais) — rascunho do dono, projetos irmãos que ele lê e bins próprios do projeto. Assim os hooks continuam `igual` ao canon e as atualizações chegam sem `customizado`. O `areas.local.json` é **versionado** (sessão aberta numa worktree usa a cópia de lá); são descartados paths com `..`, `scratch` que contenha o projeto, `scratch`/`leitura` que contenha a home e shells/wrappers em `headsProjeto` (`leitura` pode ser o monorepo que contém o projeto: só dá leitura aos irmãos). Os hook-tests (`node .claude/hooks/tools/hook-test.mjs`, da raiz) tiram os caminhos desse arquivo; rode-os depois do `apply`. O `apply` mescla `permissions.allow/deny/ask` e `hooks` (matchers `Bash` e `PowerShell`) em `.claude/settings.json` **uma vez**: o que o playbook já ofereceu fica registrado em `ok-playbook.json` (`settings`), então regra ou matcher que o dono remover depois não volta; se o projeto já tinha um matcher desses, o dele é mantido. Na primeira vez, o `apply` também **limpa o legado 0.x**: tira `Bash(rm *)`/`Bash(mv *)` do `allow` e troca o comando de hook antigo pelo canônico (linhas `settings	…` antes da linha-sinal; o que o dono re-adicionar depois não é removido de novo). Arquivo de hook antigo que ele avisar no disco, remova. Se `settings.json` não for JSON válido (ex.: comentário) o `apply` para antes de escrever qualquer coisa (`FALTA: … não é JSON válido`): o dono corrige o arquivo ou você usa `--sem settings`, que desliga o merge. BOM, fim de linha e indentação do arquivo são preservados.
7. Rode `apply` com as flags decididas. Repita até `OK` (`FALTA: N itens pedem decisão` lista o que falta decidir).
8. **`_index.md` semeado:** se o `plan` mostrou `novo  semente:arch`, o `<arch>_index.md` acabou de nascer do template — preencha o nome do projeto e a árvore **real** da pasta de arquitetura (o que existe, com uma linha de descrição), tire o que não existe e deixe "a preencher" no que você não sabe. Não invente arquitetura.
9. Rode `status` → `OK sem drift`. Mostre ao dono o `git status --short` e proponha o commit (`chore: configura ok-playbook v<versão>`).
10. **Feche com o que ele recebeu.** Em poucas linhas: o que foi instalado (pastas, agentes, hooks, permissões), o que ficou de fora ou como customização local, o que cada sessão passa a fazer (pergunta de perfil, sinal de atenção, feedback, pendências) e as pendências abertas no passo 5. Aponte `<docs>/ok-playbook/patterns/visao-geral.md` como a referência para ele e para quem entrar no projeto depois, e diga como atualizar (`git -C <SKILL_DIR> pull` + modo atualizar).

## Migração de um projeto 0.x (formato de pacote → skill)

Migração é trabalho de **funcionalidade**, não ajuste: rode numa worktree do
projeto (siga o processo dele) e só por pedido explícito do dono — nunca porque
um "revalida o playbook" caiu aqui. Faça um passo por commit.

**M1. Inventário (só leitura).** Descubra e mostre ao dono:
- **Formato de consumo:** submódulo (`.gitmodules` com `ok-playbook`), dependência
  npm (`"ok-playbook": "git+…#vX"` no `package.json`), ou cópia solta (pasta com os
  arquivos do playbook versionados no próprio projeto).
- **Caminhos** já declarados (`ok-playbook.config.json` → `paths`; senão procure as
  pastas de docs, feedback, pendências) — viram o `paths` do `ok-playbook.json`.
- **Quem cita o playbook pelo caminho antigo:** `git grep -nE "ok-playbook/(patterns|agents|templates|install)|node_modules/ok-playbook|packages/ok-playbook|<playbook-root>|OKPLAYBOOK|ok-playbook\.config|claude-md-include|playbook-audit"`, separando
  arquivos vivos (CLAUDE.md, AGENTS.md, `.claude/`, `.agents/`, scripts, docs de
  arquitetura, `ARCHITECTURE.md`) de histórico (feedback, pendências, specs/planos
  antigos — esses ficam como estão).
- **Cópias locais já existentes:** hooks em `.claude/hooks/`, `scripts/worktree.mjs`
  e afins, perfis, regras de git — vão virar `customizado` ou `do-projeto`, nunca
  sobrescritos sem o dono escolher.
- **O que o CLAUDE.md do projeto tem por conta própria** e que repete o processo
  (blocos "processo vigente", "este bloco vence o playbook"): é o que a fusão (M4)
  vai resolver.

**M2. Remover o formato antigo e consertar quem o cita — no mesmo commit.**
- *Submódulo:* `git submodule deinit -f <path>` (só com o checkout do submódulo
  limpo e o HEAD dele existente no repo do playbook), `git rm <path>`, tirar a
  seção do `.gitmodules` (apague o arquivo se ficar vazio). Scripts que tratavam o
  submódulo pelo nome (abrir/fechar worktree, suíte que o pulava) precisam deixar
  de tratar — mas worktrees **já abertas** continuam com ele: o `close` delas e a
  suíte precisam tolerar o resto até fecharem.
- *Dependência npm:* tirar `ok-playbook` do `package.json` e atualizar o lockfile
  **é mudança de dependência — pare e peça o ok do dono antes**; rode a instalação
  do jeito do projeto (com o app do dono fechado, se ele trava arquivos). Se o
  projeto mora dentro do workspace pnpm de outro repositório, instale com
  `--ignore-workspace` (confira antes com `pnpm root`) — sem a flag o pnpm reescreve
  o lockfile do repositório pai.
- *Cópia solta:* `git rm -r` da pasta.
- Em todos: remover `ok-playbook.config.json`, `OKPLAYBOOK.md`,
  `OKPLAYBOOK.history/` e as skills `playbook-audit` (`.claude/skills/`,
  `.agents/skills/`); reapontar cada referência viva do M1 para o destino novo
  (`<docs>ok-playbook/patterns/…`, `<docs>ok-playbook/templates/…`,
  `.claude/skills/<nome>/SKILL.md`), com caminho relativo correto **a partir de cada
  arquivo**. Ao final, o grep do M1 só acha histórico.

**M3. Configurar.** Siga o Modo 1 (passos 1–10) com os `paths` do inventário. O que
esperar no `plan` de um projeto migrado:
- `regras:CLAUDE.md` → `atualizavel` (o bloco legado `include` é trocado pelo novo).
- `skill:*` → `conflito` (os ponteiros antigos) → `--so`.
- `hook:*` → `conflito` se o projeto já tinha hooks: o que o dono customizou em
  áreas/whitelist vai para `.claude/hooks/areas.local.json` e o hook volta ao canon
  (`--so`); `--manter` só para mudança de lógica que o canon não tem (mostre o diff
  e ofereça o Modo 3).
- Scripts e perfis próprios → `--do-projeto <paths>`.
- `regras:AGENTS.md`: se o AGENTS.md do projeto só manda ler o CLAUDE.md, `--sem
  regras:AGENTS.md` evita o bloco duplicado; senão deixe entrar.

**M4. Fundir o CLAUDE.md (e o AGENTS.md).** Antes de editar, guarde fora do repo a
versão anterior (`git show <base>:CLAUDE.md > <scratch>/claude-md-antes.md`). Para
cada regra do projeto fora do bloco: se o bloco ou `<docs>ok-playbook/patterns/`
já a contém (mesmo sentido) → sai; se é específica do projeto (comandos reais dos
scripts, banco, infra, regras fixas) → fica; se é genérica e o canon não tem → fica
numa seção "Complementos do <projeto> ao processo" **e** proponha o Modo 3. Regra
de **toda sessão** (git destrutivo, sinal de atenção, parada) nunca pode ficar só
no pattern — tem de estar no bloco ou no CLAUDE.md. Notas de precedência do tipo
"este bloco vence o playbook" saem (o bloco já declara a precedência). Ponteiros
no AGENTS.md para o include antigo passam a apontar para o bloco. Nunca edite
dentro dos marcadores `ok-playbook:start/end`; o `status` tem de continuar `OK`.

**M5. Provar.** `status` → `OK sem drift`; o grep do M1 só acha histórico; a suíte
do projeto (pelo script dele) sem regressão; uma sessão nova do agente responde,
sem abrir nada fora do repo, onde está um protocolo (ex.: docs-review) e qual a
receita de commit em fase paralela. A revisão do conjunto compara **regra a
regra** o `claude-md-antes.md` com bloco + CLAUDE.md novo e lista o que sumiu.

**M6. Depois do merge.** Se a main andou e conflitou no CLAUDE.md, não resolva
"ficando com o lado da branch" sem olhar: regra nova do dono na main vai para o
canon (Modo 3) ou para os complementos, e o bloco é regenerado com `apply`.

## Modo 2 — Atualizar / auditar (projeto com `ok-playbook.json`)

1. `status`. `OK sem drift` → informe a versão e pare.
2. `plan` e trate por classe:
   - `atualizavel` → aplica sem perguntar.
   - `editado` (o projeto mexeu num item materializado) → mostre o diff contra o canon; o dono escolhe `--so` (volta ao canon) ou `--manter` (vira customização). Se a edição parece genérica, ofereça o Modo 3.
   - `customizado-canon-mudou` → o canon mudou num item que o projeto mantém local: mostre o que mudou no canon; o dono reavalia (`--so` ou `--manter` de novo para registrar que viu). Hook customizado só em áreas/whitelist (`SCRATCH`, `LEITURA`, `HEADS_PROJETO`): mova os valores para `.claude/hooks/areas.local.json` e volte ao canon com `--so`.
   - `_index.md` semeado por versão anterior: semente nunca é reescrita — se ele tem links `docs/ok-playbook/…` a partir da raiz, corrija-os para caminho relativo ao próprio arquivo.
   - `do-projeto` que é cópia do canon (ex.: `scripts/worktree.mjs` copiado no passo 5): o canon pode ter corrigido algo nele — compare com `<SKILL_DIR>/assets/scripts/` e porte a correção, preservando a adaptação do projeto.
   - `orfao` → o canon deixou de ter o item: proponha remover o arquivo (com o sim do dono) **e** a entrada do item em `ok-playbook.json` (o script não tem flag para isso; é a única edição manual permitida do manifesto fora do Modo 1).
   - `customizado-ausente` → o arquivo que o projeto mantinha local sumiu: restaure do canon com `--so <id>` ou desista da customização com `--sem <id>`.
   - `do-projeto-ausente` → o script do projeto sumiu: trate como no Modo 1, passo 5.
   - `marcador-quebrado` → `CLAUDE.md`/`AGENTS.md` tem `ok-playbook:start` sem `ok-playbook:end` (ou o contrário): o script não escreve esse item. Mostre ao dono o trecho, ele conserta os marcadores à mão (ou pede para você consertar), e rode `apply` de novo.
3. `apply` → `status` → `OK`. Proponha o commit (`chore: atualiza ok-playbook para v<versão>`).

## Explicar (qualquer projeto)

Pergunta sobre o que o ok-playbook faz ou impõe: responda a partir de `references/patterns/visao-geral.md` (ou da cópia materializada em `<docs>/ok-playbook/patterns/visao-geral.md`, se o projeto já está configurado — ela mostra os caminhos reais dele). Para o detalhe de uma regra, abra o pattern que a visão geral aponta. Não configure nada neste modo.

Projeto ainda não configurado: cruze a visão geral com o que ele já tem — `CLAUDE.md`/`AGENTS.md` (o bloco entra no topo; o resto fica), pastas de docs com o mesmo papel (que viram os `paths`), `.claude/settings.json` e hooks existentes (merge, não substituição), scripts que já cumprem algum verbo de processo — e diga o que seria criado, o que seria alterado e o que daria para recusar. Só leitura: sem `ok-playbook.json`, sem `plan`, sem escrever nada.

## Modo 3 — Contribuir

Siga `.claude/skills/playbook-contribute/SKILL.md` do projeto (ou `references/agents/playbook-contribute.md` daqui). A fonte do playbook é `SKILL_DIR` (siga link/junction até o clone git). Nunca edite o canon materializado no projeto para "contribuir" — a mudança nasce no clone e volta ao projeto pelo Modo 2.

## Nunca

- Editar à mão `ok-playbook.json` (exceto `paths`/`contribuicao` no Modo 1 e a remoção de entrada `orfao` no Modo 2).
- Sobrescrever item `conflito`/`editado`/`customizado` sem o dono ter escolhido.
- Criar scripts de suíte ou banco de teste dentro desta skill — é sessão separada.
