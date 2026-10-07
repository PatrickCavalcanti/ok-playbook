---
description: "Materializa uma proposta de mudança no ok-playbook a partir de insight/feedback local. Opera em três modos (direct/branch-pr/request) conforme o campo `contribuicao` de ok-playbook.json."
when_to_use: "quando o usuário pede 'propor mudança no playbook' ou 'sobe isso pro playbook', ou quando docs-review identifica insight que parece genérico e oferece promover upstream"
---

# Agente — Playbook Contribute

Propõe mudança upstream no `ok-playbook` a partir de um insight, feedback ou patch local. Opera em **três modos** conforme o campo `contribuicao` de `ok-playbook.json` (default `direct`):

| Modo | Quem usa | O que faz |
|---|---|---|
| `direct` | Mantenedor do playbook: o diretório da skill é um clone git com push na main | Commit + push direto na main do clone da skill |
| `branch-pr` | Clone git com acesso a branch mas sem push na main | Cria branch, commit, push, abre MR/PR com insight + diff |
| `request` | O diretório da skill não é um clone git com push (ou o dono prefere não escrever nele) | Gera artefato em `<insights-root>/upstream-proposals/` pra mantenedor aplicar manualmente |

**Referência canônica:** [`<playbook-root>patterns/feedback-loop.md §9.2`](<playbook-root>patterns/feedback-loop.md) (insights como fila pra fora).

**Gatilho:** **manual apenas.** Invocado pelo usuário ("propor mudança no playbook", "sobe isso pro playbook") ou oferecido pelo `docs-review` quando ele processa feedback que parece genérico. Não dispara sozinho.

---

## Pré-condições

- [ ] **Fonte do playbook localizada:** é o diretório da skill `ok-playbook` instalada (ex.: `~/.claude/skills/ok-playbook`) — siga a junction/link até o clone git real e use esse caminho (`<fonte>`) nos passos abaixo. Modo `direct` só se `<fonte>` é um clone git com push; senão `request` (proposta em `<insights-root>/upstream-proposals/` a partir de `<playbook-root>templates/upstream-proposal.md`).
- [ ] `ok-playbook.json` (raiz do projeto) tem o campo `contribuicao` (`direct` / `branch-pr` / `request`; ausente = `direct`, rebaixado para `request` se `<fonte>` não for clone git com push). Se o valor for inválido, **perguntar uma vez ao usuário** e gravar o campo antes de prosseguir.
- [ ] Há **fonte clara da proposta**: um arquivo de insight, um item de feedback, ou descrição explícita do usuário. Sem fonte, abortar: "Preciso de um insight ou feedback pra basear a proposta — qual arquivo motiva esta mudança?"

---

## Protocolo de execução

### 1. Identificar a fonte

Aceita como entrada (em ordem de preferência):

1. **Path explícito** (argumento): `<insights-root>/YYYY-MM-DD-<tema>.md` ou `<backlog-root>/<producer>/<arquivo>.md`.
2. **Lista de candidatos** (sem argumento): grep por `status: open` + `type: architecture|playbook` em `<insights-root>/`, e arquivos de feedback com sugestões que mencionam o playbook (`ok-playbook`). Mostrar lista, pedir escolha.
3. **Descrição inline** (usuário descreve no chat): aceitar, mas perguntar se deve **primeiro** criar um insight em `<insights-root>/` pra ter rastro — recomendação: sim.

### 2. Planejar a mudança

Antes de tocar em qualquer arquivo:

1. Ler a fonte completa.
2. Identificar **exatamente** o que muda no playbook: path(s) afetado(s) em `<fonte>`, tipo de mudança (novo pattern, edição de pattern, novo template, adição em `assets/settings-snippet.json`, etc.).
3. Mostrar ao usuário um **plano resumido**:
   > "Vou propor: [resumo da mudança]. Arquivos afetados: [lista]. Motivação: [link pro insight]. OK?"
4. Aguardar OK antes de qualquer edição.

### 3. Roteamento por modo

Ler o campo `contribuicao` de `ok-playbook.json`. Seguir o branch correspondente.

---

### 3a. Modo `direct`

Para mantenedor com push na main do clone.

1. **Aplicar edições** em `<fonte>` (Edit/Write).
2. **Mostrar diff** completo (`git -C <fonte> diff`).
3. **Confirmar com usuário.**
4. **Commit no clone:**
   ```
   git -C <fonte> add <paths>
   git -C <fonte> commit -m "<tipo>: <descrição>

   Motivação: <link ou resumo do insight>
   "
   ```
5. **Push pra main:** `git -C <fonte> push origin main`. Como a skill instalada é o próprio clone, a mudança já vale na máquina; nos projetos, o conteúdo materializado só muda ao rodar a skill `ok-playbook` no modo atualizar.
6. **Atualizar a fonte** (insight/feedback): adicionar nota "Aplicado upstream em commit `<sha>` do ok-playbook em YYYY-MM-DD." e mudar status pra `applied` (se insight) ou registrar em "Processado".

---

### 3b. Modo `branch-pr`

Para clone git com acesso a branch mas sem push na main.

1. **Aplicar edições** em `<fonte>` (Edit/Write).
2. **Mostrar diff** completo.
3. **Confirmar com usuário.**
4. **Criar branch no clone:**
   ```
   git -C <fonte> checkout -b proposal/<slug-curto>
   git -C <fonte> add <paths>
   git -C <fonte> commit -m "<tipo>: <descrição>

   Motivação: <link ou resumo do insight>
   "
   git -C <fonte> push -u origin proposal/<slug-curto>
   ```
5. **Abrir PR/MR** via `gh pr create` (ou equivalente da forge). **Body do PR deve conter:**
   - Resumo da mudança (1-3 linhas).
   - **Insight de origem completo** (corpo do arquivo `<insights-root>/...`) — embutido inline, não link, porque o mantenedor do playbook não tem acesso ao repo do projeto.
   - Diff dos arquivos afetados (deixar o PR mostrar).
   - Como testar/validar (steps mínimos).
   - Projeto consumidor de origem (nome).
6. **Registrar PR** em `<insights-root>/upstream-proposals/YYYY-MM-DD-<slug>.md` a partir de [`<playbook-root>templates/upstream-proposal.md`](<playbook-root>templates/upstream-proposal.md) com:
   - `mode: branch-pr`
   - `status: submitted`
   - `pr_url: <url>`
   - Cópia do diff e da motivação.
7. **Voltar o clone para a main** (`git -C <fonte> checkout main`) — a skill instalada não pode ficar numa branch de proposta. Avisar usuário:
   > "PR aberto: <url>. Quando for merged na main do playbook, atualize o clone (`git -C <fonte> pull`) e rode a skill `ok-playbook` no modo atualizar em cada projeto."

---

### 3c. Modo `request`

Para quando `<fonte>` não é um clone git com push.

1. **NÃO tocar em `<fonte>`** — read-only neste modo.
2. **Gerar artefato** em `<insights-root>/upstream-proposals/YYYY-MM-DD-<slug>.md` a partir de [`<playbook-root>templates/upstream-proposal.md`](<playbook-root>templates/upstream-proposal.md) contendo:
   - `mode: request`
   - `status: drafted`
   - **Diff completo** dos arquivos a alterar (gerado mentalmente — mostrar o conteúdo "antes" e "depois" de cada arquivo).
   - **Steps executáveis pelo mantenedor**: comandos copy-paste-ready (criar/editar arquivo X, commitar com mensagem Y, push).
   - **Insight de origem completo** embutido.
   - **Como o consumidor sabe que foi aplicado**: instrução pra rodar a skill `ok-playbook` no modo atualizar após receber confirmação.
3. **Commitar o artefato no projeto** (não em `<fonte>`): `git add <artefato> && git commit -m "docs: proposta upstream pro ok-playbook — <slug>"`.
4. **Instruir o usuário** sobre como enviar ao mantenedor — sem assumir canal (email, Slack, issue):
   > "Artefato pronto em `<path>`. Envie ao mantenedor do ok-playbook pelo canal combinado (não tenho como assumir qual). Quando ele responder que aplicou, atualize o clone da skill e rode a skill `ok-playbook` no modo atualizar pra adotar."
5. **Atualizar status do artefato** conforme o usuário reporta: `drafted` → `sent` → `accepted` / `rejected` / `merged`. Esses updates são edições manuais subsequentes (não automatizadas).

---

### 4. Encerramento

Após qualquer modo, resumir:

> "Proposta processada em modo `<modo>`.
> - Mudança: <resumo>.
> - Status: <commit pushed / PR aberto / artefato gerado>.
> - Próximo passo: <atualizar projetos / aguardar review do PR / enviar ao mantenedor>.
> - Rastro: <link/path>."

---

## Escopo do playbook-contribute

**Modifica (no modo correspondente):**
- `<fonte>` (o clone do playbook) em modos `direct` e `branch-pr`.
- `<insights-root>/upstream-proposals/` em todos os modos (artefato de rastro).
- A fonte original (insight/feedback) — adiciona nota de aplicação em modo `direct`.

**Não modifica:**
- `ok-playbook.json` — exceto pra preencher o campo `contribuicao` se estiver inválido.

**Nunca:**
- Faz `git push` no repositório do projeto — só no clone do playbook, e só nos modos `direct`/`branch-pr`.
- Pula a confirmação do usuário antes de aplicar diff em `<fonte>`.
- Opera em modo diferente do registrado em `ok-playbook.json` sem perguntar e atualizar o campo.
- Inventa o canal de envio em modo `request` — sempre pergunta/orienta, nunca tenta enviar.

---

## Regras invariantes

- **Toda proposta upstream tem rastro local** em `<insights-root>/upstream-proposals/` — mesmo no modo `direct`. Permite auditoria de "o que esse projeto promoveu pro playbook ao longo do tempo".
- **Insight de origem é obrigatório.** Sem insight ou feedback como motivação, agente recusa: a regra é "promoção manual baseada em sinal documentado", não "qualquer mudança que pareça útil".
- **Diff antes de aplicar** em modos `direct` e `branch-pr`.
- **PR body em `branch-pr` inclui o insight completo embutido** — mantenedor do playbook não acessa o repo consumidor.
- **Modo `request` é read-only na fonte** — zero edição em `<fonte>`.
