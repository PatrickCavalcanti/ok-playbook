---
name: ok-playbook
description: "Configura um projeto com o processo de desenvolvimento do ok-playbook (regras para CLAUDE.md/AGENTS.md, protocolos docs-review/new-agent/permissions-review/playbook-contribute, patterns, templates, hooks) e mantém o projeto alinhado ao canon. Também leva mudanças do projeto de volta ao playbook."
when_to_use: "configurar o ok-playbook num projeto; atualizar/auditar um projeto já configurado contra o canon ('revalida o playbook', 'audita drift'); propor mudança no playbook a partir de insight/feedback do projeto ('sobe isso pro playbook')"
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

1. Confirme a raiz do projeto (git root) e que a árvore está limpa (`git status --short`). Suja → pergunte ao dono se commita antes.
2. Proponha os caminhos com os defaults abaixo, ajustados ao que já existe no projeto (procure pastas de docs, feedback, pendências). Pergunte só o que o projeto não responde.
   `docs` `docs/` · `arch` `docs/project-architecture/` · `agents` `docs/project-architecture/agents/` · `superpowers` `docs/superpowers/` · `backlog` `docs/agent-feedback/` · `drafts` `docs/_drafts/` · `insights` `docs/insights/` · `pendencias` `docs/pendencias/`
3. Grave `ok-playbook.json` com `{ "paths": { … }, "contribuicao": "direct" }`. O script exige que o arquivo exista; chaves omitidas em `paths` recebem o default acima.
4. Rode `plan`. Para cada linha:
   - `novo` / `atualizavel` — será escrito.
   - `conflito` (arquivo já existe, diferente do canon e sem registro) — mostre a diferença ao dono e decida: sobrescrever (`--so <id>`), manter a versão local (`--manter <id>`), ou não usar o item (`--sem <id>`). Em `regras:CLAUDE.md`/`regras:AGENTS.md` o arquivo existente do projeto nunca é conflito: o bloco é inserido no topo e o resto fica intocado (um bloco legado `ok-playbook:include` é substituído).
5. Scripts de processo (`references/patterns/dev-process.md §7`): para cada verbo (worktree, suíte global, banco de teste), se o projeto já tem um script que cumpre o contrato, registre com `--do-projeto <path>`. Se não tem: worktree → copie `<SKILL_DIR>/assets/scripts/worktree.mjs` para `scripts/`, adapte ao gerenciador de pacotes do projeto e só então registre com `--do-projeto` (o arquivo precisa existir, senão aparece `do-projeto-ausente`); suíte e banco → **não escreva agora**: registre uma linha em `<pendencias>` com o contrato do verbo (§7) para uma sessão separada.
6. Hooks (`.claude/hooks/`): são materializados com a raiz do projeto preenchida. Rode o primeiro `apply` para que `.claude/hooks/lib/areas.mjs` exista, ajuste `SCRATCH`/`LEITURA` nele ao que o dono usa e então rode `apply` de novo com `--manter hook:lib/areas.mjs` (registrar antes de o arquivo existir não o escreve). O `apply` mescla `permissions.allow/deny` e `hooks` (matchers `Bash` e `PowerShell`) em `.claude/settings.json` **uma vez**: o que o playbook já ofereceu fica registrado em `ok-playbook.json` (`settings`), então regra ou matcher que o dono remover depois não volta; se o projeto já tinha um matcher desses, o dele é mantido — confira se ele aponta para `.claude/hooks/…`. Se `settings.json` não for JSON válido (ex.: comentário) o `apply` para antes de escrever qualquer coisa (`FALTA: … não é JSON válido`): o dono corrige o arquivo ou você usa `--sem settings`, que desliga o merge. BOM, fim de linha e indentação do arquivo são preservados.
7. Rode `apply` com as flags decididas. Repita até `OK` (`FALTA: N itens pedem decisão` lista o que falta decidir).
8. Rode `status` → `OK sem drift`. Mostre ao dono o `git status --short` e proponha o commit (`chore: configura ok-playbook v<versão>`).

## Modo 2 — Atualizar / auditar (projeto com `ok-playbook.json`)

1. `status`. `OK sem drift` → informe a versão e pare.
2. `plan` e trate por classe:
   - `atualizavel` → aplica sem perguntar.
   - `editado` (o projeto mexeu num item materializado) → mostre o diff contra o canon; o dono escolhe `--so` (volta ao canon) ou `--manter` (vira customização). Se a edição parece genérica, ofereça o Modo 3.
   - `customizado-canon-mudou` → o canon mudou num item que o projeto mantém local: mostre o que mudou no canon; o dono reavalia (`--so` ou `--manter` de novo para registrar que viu).
   - `orfao` → o canon deixou de ter o item: proponha remover o arquivo (com o sim do dono) **e** a entrada do item em `ok-playbook.json` (o script não tem flag para isso; é a única edição manual permitida do manifesto fora do Modo 1).
   - `do-projeto-ausente` → o script do projeto sumiu: trate como no Modo 1, passo 5.
   - `marcador-quebrado` → `CLAUDE.md`/`AGENTS.md` tem `ok-playbook:start` sem `ok-playbook:end` (ou o contrário): o script não escreve esse item. Mostre ao dono o trecho, ele conserta os marcadores à mão (ou pede para você consertar), e rode `apply` de novo.
3. `apply` → `status` → `OK`. Proponha o commit (`chore: atualiza ok-playbook para v<versão>`).

## Modo 3 — Contribuir

Siga `.claude/skills/playbook-contribute/SKILL.md` do projeto (ou `references/agents/playbook-contribute.md` daqui). A fonte do playbook é `SKILL_DIR` (siga link/junction até o clone git). Nunca edite o canon materializado no projeto para "contribuir" — a mudança nasce no clone e volta ao projeto pelo Modo 2.

## Nunca

- Editar à mão `ok-playbook.json` (exceto `paths`/`contribuicao` no Modo 1 e a remoção de entrada `orfao` no Modo 2).
- Sobrescrever item `conflito`/`editado`/`customizado` sem o dono ter escolhido.
- Criar scripts de suíte ou banco de teste dentro desta skill — é sessão separada.
