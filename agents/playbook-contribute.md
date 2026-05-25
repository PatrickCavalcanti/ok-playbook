---
description: "Materializa uma proposta de mudança no ok-playbook a partir de insight/feedback local. Opera em três modos (direct/branch-pr/request) conforme registrado em OKPLAYBOOK.md."
agent: "agent"
argument-hint: "Passe o path do insight ou feedback que motiva a mudança (ex: 'docs/insights/2026-05-25-permissions-mklink.md'), ou deixe em branco para listar candidatos."
---

# Agente — Playbook Contribute

Propõe mudança upstream no `ok-playbook` a partir de um insight, feedback ou patch local. Opera em **três modos** conforme registrado em `OKPLAYBOOK.md`:

| Modo | Quem usa | O que faz |
|---|---|---|
| `direct` | Mantenedor do playbook, ambiente com push na main | Commit + push direto na main do submódulo + bump no super-repo |
| `branch-pr` | Time com git access mas sem push na main | Cria branch, commit, push, abre MR/PR com insight + diff |
| `request` | Consumidor sem git access ao playbook | Gera artefato em `<insights-root>/upstream-proposals/` pra mantenedor aplicar manualmente |

**Referência canônica:** [`../patterns/feedback-loop.md §9.2`](../patterns/feedback-loop.md) (insights como fila pra fora) + [`../README.md §Como contribuir`](../README.md).

**Gatilho:** **manual apenas.** Invocado pelo usuário ("propor mudança no playbook", "sobe isso pro playbook") ou oferecido pelo `docs-review` quando ele processa feedback que parece genérico. Não dispara sozinho.

---

## Pré-condições

- [ ] `packages/ok-playbook/` existe.
- [ ] `OKPLAYBOOK.md` tem campo "Modo de contribuição upstream" preenchido (`direct` / `branch-pr` / `request`). Se for `unknown`, **perguntar uma vez ao usuário** e atualizar o manifesto antes de prosseguir.
- [ ] Há **fonte clara da proposta**: um arquivo de insight, um item de feedback, ou descrição explícita do usuário. Sem fonte, abortar: "Preciso de um insight ou feedback pra basear a proposta — qual arquivo motiva esta mudança?"

---

## Protocolo de execução

### 1. Identificar a fonte

Aceita como entrada (em ordem de preferência):

1. **Path explícito** (argumento): `<insights-root>/YYYY-MM-DD-<tema>.md` ou `<backlog-root>/<producer>/<arquivo>.md`.
2. **Lista de candidatos** (sem argumento): grep por `status: open` + `type: architecture|playbook` em `<insights-root>/`, e arquivos de feedback com sugestões que mencionam `packages/ok-playbook/`. Mostrar lista, pedir escolha.
3. **Descrição inline** (usuário descreve no chat): aceitar, mas perguntar se deve **primeiro** criar um insight em `<insights-root>/` pra ter rastro — recomendação: sim.

### 2. Planejar a mudança

Antes de tocar em qualquer arquivo:

1. Ler a fonte completa.
2. Identificar **exatamente** o que muda no playbook: path(s) afetado(s) em `packages/ok-playbook/`, tipo de mudança (novo pattern, edição de pattern, novo template, adição em `permissions-snippet.json`, etc.).
3. Mostrar ao usuário um **plano resumido**:
   > "Vou propor: [resumo da mudança]. Arquivos afetados: [lista]. Motivação: [link pro insight]. OK?"
4. Aguardar OK antes de qualquer edição.

### 3. Roteamento por modo

Ler `OKPLAYBOOK.md` → "Modo de contribuição upstream". Seguir o branch correspondente.

---

### 3a. Modo `direct`

Para mantenedor com push na main.

1. **Aplicar edições** em `packages/ok-playbook/` (Edit/Write).
2. **Mostrar diff** completo (`git -C packages/ok-playbook diff`).
3. **Confirmar com usuário.**
4. **Commit no submódulo:**
   ```
   cd packages/ok-playbook
   git add <paths>
   git commit -m "<tipo>: <descrição>

   Motivação: <link ou resumo do insight>
   "
   ```
5. **Push pra main:** `git push origin main`.
6. **Bump no super-repo:** voltar pra raiz do consumidor, `git add packages/ok-playbook && git commit -m "chore: bump ok-playbook"`. **Não dar push do super-repo automaticamente** — usuário decide quando.
7. **Atualizar a fonte** (insight/feedback): adicionar nota "Aplicado upstream em commit `<sha>` do ok-playbook em YYYY-MM-DD." e mudar status pra `applied` (se insight) ou registrar em "Processado".

⚠️ **Pegadinha clássica** (do README do playbook): se commitar a referência no super-repo **antes** de pushar o submódulo, outros consumidores não conseguem clonar. Push do submódulo SEMPRE antes do commit no super-repo.

---

### 3b. Modo `branch-pr`

Para consumidor com git access mas sem push na main.

1. **Aplicar edições** em `packages/ok-playbook/` (Edit/Write).
2. **Mostrar diff** completo.
3. **Confirmar com usuário.**
4. **Criar branch no submódulo:**
   ```
   cd packages/ok-playbook
   git checkout -b proposal/<slug-curto>
   git add <paths>
   git commit -m "<tipo>: <descrição>

   Motivação: <link ou resumo do insight>
   "
   git push -u origin proposal/<slug-curto>
   ```
5. **Abrir PR/MR** via `gh pr create` (ou equivalente da forge). **Body do PR deve conter:**
   - Resumo da mudança (1-3 linhas).
   - **Insight de origem completo** (corpo do arquivo `<insights-root>/...`) — embutido inline, não link, porque o mantenedor do playbook não tem acesso ao repo consumidor.
   - Diff dos arquivos afetados (deixar o PR mostrar).
   - Como testar/validar (steps mínimos).
   - Projeto consumidor de origem (nome).
6. **Registrar PR** em `<insights-root>/upstream-proposals/YYYY-MM-DD-<slug>.md` a partir de [`../templates/upstream-proposal.md`](../templates/upstream-proposal.md) com:
   - `mode: branch-pr`
   - `status: submitted`
   - `pr_url: <url>`
   - Cópia do diff e da motivação.
7. **NÃO bumpar a referência** do submódulo no super-repo — branch ainda não está merged. Avisar usuário:
   > "PR aberto: <url>. Quando for merged na main do playbook, rode `git submodule update --remote packages/ok-playbook` e depois `playbook-audit` pra adotar."

---

### 3c. Modo `request`

Para consumidor sem git access ao playbook.

1. **NÃO tocar em `packages/ok-playbook/`** — submódulo é read-only neste modo.
2. **Gerar artefato** em `<insights-root>/upstream-proposals/YYYY-MM-DD-<slug>.md` a partir de [`../templates/upstream-proposal.md`](../templates/upstream-proposal.md) contendo:
   - `mode: request`
   - `status: drafted`
   - **Diff completo** dos arquivos a alterar (gerado mentalmente — mostrar o conteúdo "antes" e "depois" de cada arquivo).
   - **Steps executáveis pelo mantenedor**: comandos copy-paste-ready (criar/editar arquivo X, commitar com mensagem Y, push).
   - **Insight de origem completo** embutido.
   - **Como o consumidor sabe que foi aplicado**: instrução pra rodar `playbook-audit` após receber confirmação.
3. **Commitar o artefato no projeto consumidor** (não no submódulo): `git add <artefato> && git commit -m "docs: proposta upstream pro ok-playbook — <slug>"`.
4. **Instruir o usuário** sobre como enviar ao mantenedor — sem assumir canal (email, Slack, issue):
   > "Artefato pronto em `<path>`. Envie ao mantenedor do ok-playbook pelo canal combinado (não tenho como assumir qual). Quando ele responder que aplicou, rode `playbook-audit` pra puxar e adotar."
5. **Atualizar status do artefato** conforme o usuário reporta: `drafted` → `sent` → `accepted` / `rejected` / `merged`. Esses updates são edições manuais subsequentes (não automatizadas).

---

### 4. Encerramento

Após qualquer modo, resumir:

> "Proposta processada em modo `<modo>`.
> - Mudança: <resumo>.
> - Status: <commit pushed / PR aberto / artefato gerado>.
> - Próximo passo: <bump + audit / aguardar review do PR / enviar ao mantenedor>.
> - Rastro: <link/path>."

---

## Escopo do playbook-contribute

**Modifica (no modo correspondente):**
- `packages/ok-playbook/` em modos `direct` e `branch-pr`.
- `<insights-root>/upstream-proposals/` em todos os modos (artefato de rastro).
- A fonte original (insight/feedback) — adiciona nota de aplicação em modo `direct`.

**Não modifica:**
- `OKPLAYBOOK.md` — exceto pra preencher o campo "Modo de contribuição upstream" se estiver `unknown`.
- Bumpar referência do submódulo no super-repo automaticamente em modo `branch-pr` (só em `direct`).

**Nunca:**
- Faz `git push` no super-repo do consumidor. Bump da referência é commit local; usuário decide quando push.
- Pula a confirmação do usuário antes de aplicar diff em `packages/ok-playbook/`.
- Opera em modo diferente do registrado em `OKPLAYBOOK.md` sem perguntar e atualizar o manifesto.
- Inventa o canal de envio em modo `request` — sempre pergunta/orienta, nunca tenta enviar.

---

## Regras invariantes

- **Toda proposta upstream tem rastro local** em `<insights-root>/upstream-proposals/` — mesmo no modo `direct`. Permite auditoria de "o que esse projeto promoveu pro playbook ao longo do tempo".
- **Insight de origem é obrigatório.** Sem insight ou feedback como motivação, agente recusa: a regra é "promoção manual baseada em sinal documentado", não "qualquer mudança que pareça útil".
- **Diff antes de aplicar** em modos `direct` e `branch-pr`.
- **PR body em `branch-pr` inclui o insight completo embutido** — mantenedor do playbook não acessa o repo consumidor.
- **Push do submódulo SEMPRE antes do commit no super-repo** (modo `direct`).
- **Modo `request` é read-only no submódulo** — zero edição em `packages/ok-playbook/`.
