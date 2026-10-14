---
description: "Materializa uma proposta de mudança no ok-playbook a partir de insight/feedback local — como issue ou pull request no repositório do playbook, ou commit direto quando quem propõe é o mantenedor. Modo conforme o campo `contribuicao` de ok-playbook.json (direct/branch-pr/request)."
when_to_use: "quando o usuário pede 'propor mudança no playbook' ou 'sobe isso pro playbook', ou quando docs-review identifica insight que parece genérico e oferece promover upstream"
---

# Agente — Playbook Contribute

Propõe mudança upstream no `ok-playbook` a partir de um insight, feedback ou patch local. Contribuição de fora chega ao playbook de duas formas: **issue** (a proposta descrita, para o mantenedor aplicar) ou **pull request** (a mudança pronta, para o mantenedor revisar). O mantenedor commita direto. O campo `contribuicao` de `ok-playbook.json` escolhe o modo:

| Modo | Quem usa | O que entrega |
|---|---|---|
| `direct` | Mantenedor do playbook: o diretório da skill é um clone git com push na main | Commit + push direto na main do clone da skill |
| `branch-pr` | Quem quer mandar a mudança pronta | **Pull request** no repositório do playbook (branch própria ou fork) |
| `request` | Quem quer propor sem editar o playbook — o caminho padrão de quem só instalou a skill | **Issue** no repositório do playbook com a proposta completa |

**O protocolo diz o que entregar, não com que ferramenta.** Cada ambiente chega ao GitHub (ou a outra forge) de um jeito: `gh` CLI, integração/MCP do GitHub, outra CLI, ou nenhum. Use o caminho que o ambiente tiver; sem nenhum, entregue o texto pronto e o endereço para o usuário publicar.

**Referência canônica:** [`<playbook-root>patterns/feedback-loop.md §9.2`](<playbook-root>patterns/feedback-loop.md) (insights como fila pra fora).

**Gatilho:** **manual apenas.** Invocado pelo usuário ("propor mudança no playbook", "sobe isso pro playbook") ou oferecido pelo `docs-review` quando ele processa feedback que parece genérico. Não dispara sozinho.

---

## Pré-condições

- [ ] **Fonte do playbook localizada:** é o diretório da skill `ok-playbook` instalada (ex.: `~/.claude/skills/ok-playbook`) — siga a junction/link até o diretório real (`<fonte>`).
- [ ] **Repositório do playbook identificado** (`<repo>`): o remote `upstream` do clone, se existir (clone de um fork); senão o `origin`; sem clone git, o endereço da seção "Contribuindo" do `README.md` da skill.
- [ ] `ok-playbook.json` (raiz do projeto) tem o campo `contribuicao` (`direct` / `branch-pr` / `request`; ausente = `direct`, rebaixado para `request` se `<fonte>` não for clone git com push na main). Se o valor for inválido, **perguntar uma vez ao usuário** e gravar o campo antes de prosseguir.
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
3. **Tirar o que é do projeto.** O playbook é público e agnóstico: nome de projeto, caminho de máquina, nome de pessoa, ferramenta interna e dado de cliente não entram na proposta — generalizar a regra e citar o caso só como exemplo neutro.
4. Mostrar ao usuário um **plano resumido**:
   > "Vou propor: [resumo da mudança]. Arquivos afetados: [lista]. Motivação: [link pro insight]. Entrega: [commit direto / PR / issue] em `<repo>`. OK?"
5. Aguardar OK antes de qualquer edição.

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

### 3b. Modo `branch-pr` — pull request

A mudança vai pronta, numa branch, para o mantenedor revisar.

1. **Onde a branch mora:** no `<repo>` se o usuário tem push nele; senão num **fork** dele (criar o fork pelo caminho que o ambiente tiver — ex.: `gh repo fork`; ou usar um fork que o usuário já tenha).
2. **Aplicar edições** numa branch `proposal/<slug-curto>` do clone, a partir da main atualizada.
3. **Mostrar diff** completo e **confirmar com o usuário** — abrir PR publica a mudança.
4. **Commit e push** da branch para o remote escolhido no passo 1.
5. **Abrir o PR** contra a main do `<repo>` pelo caminho disponível (ex.: `gh pr create`, integração do GitHub). **Body do PR deve conter:**
   - Resumo da mudança (1-3 linhas).
   - **Insight de origem completo**, já sem o que é do projeto (passo 2.3) — embutido inline, não link: o mantenedor não tem acesso ao repo do projeto.
   - Como testar/validar (steps mínimos).
   - Tipo de projeto de origem (stack, tamanho) — não o nome, se o usuário não quiser expor.
6. **Sem caminho para push ou PR** no ambiente: gerar o patch (`git -C <fonte> format-patch main --stdout`) e o texto do PR no artefato de rastro (passo 7) e orientar o usuário a abrir o PR por conta própria. Não inventar credencial nem token.
7. **Registrar** em `<insights-root>/upstream-proposals/YYYY-MM-DD-<slug>.md` a partir de [`<playbook-root>templates/upstream-proposal.md`](<playbook-root>templates/upstream-proposal.md): `mode: branch-pr`, `status: submitted` (ou `drafted`, se o usuário vai abrir), `pr_url`, cópia do diff e da motivação.
8. **Voltar o clone para a main** (`git -C <fonte> checkout main`) — a skill instalada não pode ficar numa branch de proposta. Avisar usuário:
   > "PR aberto: <url>. Quando for mergeado, atualize o clone (`git -C <fonte> pull`) e rode a skill `ok-playbook` no modo atualizar em cada projeto."

---

### 3c. Modo `request` — issue

A proposta vai descrita, para o mantenedor decidir e aplicar.

1. **NÃO tocar em `<fonte>`** — read-only neste modo.
2. **Escrever a proposta** em `<insights-root>/upstream-proposals/YYYY-MM-DD-<slug>.md` a partir de [`<playbook-root>templates/upstream-proposal.md`](<playbook-root>templates/upstream-proposal.md), com `mode: request`, `status: drafted` e:
   - **Título** curto da issue.
   - **Mudança proposta**: diff dos arquivos a alterar (antes/depois de cada trecho) ou, se a mudança é de regra e não de texto exato, a regra nova e onde ela entra.
   - **Insight de origem completo**, já sem o que é do projeto (passo 2.3).
   - **Como validar**.
3. **Mostrar a issue ao usuário** (título + corpo) e pedir o sim para publicar — a issue é pública.
4. **Publicar pelo caminho que o ambiente tiver** — ex.: `gh issue create -R <repo> --title "<título>" --body-file <artefato>` ou a integração do GitHub. Gravar `issue_url` e `status: submitted` no artefato.
5. **Sem caminho no ambiente:** entregar ao usuário o endereço de nova issue (`<repo>/issues/new`) e o título + corpo prontos para colar; o artefato fica `drafted` até ele confirmar que publicou (`submitted`).
6. **Commitar o artefato no projeto** (não em `<fonte>`): `git add <artefato> && git commit -m "docs: proposta upstream pro ok-playbook — <slug>"`.
7. **Atualizar status do artefato** conforme o usuário reporta: `submitted` → `accepted` / `rejected` / `merged`. Esses updates são edições manuais subsequentes (não automatizadas).

---

### 4. Encerramento

Após qualquer modo, resumir:

> "Proposta processada em modo `<modo>`.
> - Mudança: <resumo>.
> - Status: <commit pushed / PR aberto / issue aberta / texto pronto para o usuário publicar>.
> - Próximo passo: <atualizar projetos / aguardar review / publicar a issue ou PR>.
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
- Faz `git push` no repositório do projeto — só no clone do playbook (ou no fork dele), e só nos modos `direct`/`branch-pr`.
- Publica issue ou PR sem o sim do usuário ao texto final.
- Pula a confirmação do usuário antes de aplicar diff em `<fonte>`.
- Opera em modo diferente do registrado em `ok-playbook.json` sem perguntar e atualizar o campo.
- Inventa credencial, token ou canal — sem caminho no ambiente, entrega o texto pronto e o endereço.

---

## Regras invariantes

- **Toda proposta upstream tem rastro local** em `<insights-root>/upstream-proposals/` — mesmo no modo `direct`. Permite auditoria de "o que esse projeto promoveu pro playbook ao longo do tempo".
- **Insight de origem é obrigatório.** Sem insight ou feedback como motivação, agente recusa: a regra é "promoção manual baseada em sinal documentado", não "qualquer mudança que pareça útil".
- **Diff antes de aplicar** em modos `direct` e `branch-pr`.
- **Issue e PR levam o insight completo embutido** — mantenedor do playbook não acessa o repo consumidor.
- **Nada do projeto vai para fora** sem o usuário ver: nomes, caminhos e dados saem da proposta antes de mostrar.
- **Modo `request` é read-only na fonte** — zero edição em `<fonte>`.
