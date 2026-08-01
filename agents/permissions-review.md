---
description: "Revisar prompts de permissão repetidos da sessão e propor allowlist generalizada em .claude/settings.json. Delega o escaneamento à skill built-in fewer-permission-prompts; aplica o filtro de generalização de patterns/permissions.md antes de salvar."
agent: "agent"
argument-hint: "Deixe em branco para analisar a sessão atual. Pode passar 'last-N' para olhar N sessões anteriores (delegado à skill subjacente)."
---

# Agente — Permissions Review

Analisa prompts de permissão que dispararam durante a sessão (ou sessões recentes), propõe entradas para o allowlist em `.claude/settings.json` **já generalizadas** segundo o filtro de [`../patterns/permissions.md §Generalizar antes de salvar`](../patterns/permissions.md), e captura padrões recorrentes como feedback do projeto.

**Referência canônica:** [`../patterns/permissions.md`](../patterns/permissions.md) (filosofia) + [`../patterns/feedback-loop.md`](../patterns/feedback-loop.md) (categoria `permissions`).

**Gatilho:** **lazy.** Disparado no encerramento da sessão pelo bloco "Registro de prompts de permissão" do [`../install/claude-md-snippet.md`](../install/claude-md-snippet.md) **se** houve prompts de permissão repetidos durante a sessão. Pode também ser invocado manualmente a qualquer momento ("revisa permissões da sessão").

---

## Dependência externa

Este agente **depende da skill built-in `fewer-permission-prompts`** do Claude Code para o trabalho pesado de escanear transcripts. Se a skill não estiver disponível no ambiente, abortar com:

> "A skill `fewer-permission-prompts` não está disponível neste ambiente. Posso fazer uma revisão manual baseada no que você lembrar dos prompts, mas o escaneamento automático não vai funcionar."

E oferecer modo manual (usuário descreve os prompts recorrentes).

---

## Protocolo de execução

### 1. Coletar candidatos

Invocar a skill `fewer-permission-prompts`. Ela escaneia transcripts recentes e devolve uma lista priorizada de patterns que dispararam prompt mais de uma vez.

Anotar internamente:
- Pattern proposto pela skill.
- Frequência (quantas vezes apareceu).
- Categoria provável segundo [`../patterns/permissions.md §Recomendações por tipo de operação`](../patterns/permissions.md) — leitura, build, edição local, rede, install global, etc.
- **Origem: o comando começa com `cd <path> && <cmd>`** — em `.worktrees/` **ou no root do projeto**? Se sim, o lever de fix **não é `permissions.allow`** (rules não casam compounds com `cd` — ver `worktree.md §6.1`), e sim o hook `auto-approve-project-bash.js`. Comandos de build/test/exec/migration (`vite`, `vitest`, `ok-bridge`, `drizzle-kit`, etc.) só se resolvem lá. A skill `fewer-permission-prompts` (filtro read-only) corretamente os ignora pro allowlist — não force-os em `permissions.allow`; adicione o **basename** à whitelist do hook (ver §5 e §Escopo).
- **Antes de propor qualquer entrada, rode `node .claude/hooks/tools/medir-comandos.mjs` e `hook-replay.mjs --porques`.** É o que distingue "falta regra" de "o hook não entendeu o formato" — e evita empilhar entradas que nunca vão casar. Recusa por destino de escrita, por escrita em projeto irmão ou por `cd "$VAR"` é **legítima**: não vira allowlist, vira prompt mesmo.

### 2. Aplicar filtro de generalização

Para cada candidato, aplicar o filtro de [`../patterns/permissions.md §Generalizar antes de salvar`](../patterns/permissions.md):

- Substituir paths específicos por `*` (`e:\proj\.worktrees\feat-x` → `*`).
- Manter wildcards já genéricos.
- Detectar variantes de quoting (Windows/MSYS): se a skill propôs `Bash(cmd /c mklink e:\...)`, generalizar pra `Bash(cmd //c "mklink *")` E `Bash(cmd /c mklink *)` (ver §Casos especiais).
- Detectar variantes de path do mesmo worktree: agrupar como 8 variantes (`§Worktree no Windows: 8 variantes de quoting`).

Resultado: lista de **patterns generalizados** prontos pra mesclar em `permissions.allow`.

### 3. Classificar risco

Para cada pattern generalizado, classificar:

| Risco | Critério | Ação default |
|---|---|---|
| **Baixo** | Leitura/build/edição local; já coberto pela filosofia "liberal" | Propor adicionar |
| **Médio** | Rede, edição em paths além do projeto, comandos com side-effect amplo | Propor adicionar **com diff destacado** |
| **Alto** | Install global, mexer em `~/.claude/`, settings globais | **Não propor** — sinalizar como "sempre confirmar" e parar |

A tabela de risco vem direto de [`../patterns/permissions.md §Recomendações por tipo de operação`](../patterns/permissions.md).

### 4. Confirmar modo

Antes de propor mudanças, perguntar:

> "Encontrei N patterns que dispararam prompt mais de uma vez nesta sessão. Quer revisar **um a um** com classificação de risco e diff, ou prefere um **batch** dos baixo-risco já generalizados (médio/alto seguem sempre um a um)?"

### 5. Mostrar diff e aplicar

Para cada pattern proposto:

```diff
# .claude/settings.json — permissions.allow
+ "Bash(cmd //c \"mklink *\")"
+ "Bash(cmd /c mklink *)"
```

Antes de aplicar:
- **Parse + merge**, não concatenação. Não duplicar entradas existentes.
- Preferir `.claude/settings.json` (compartilhado) para patterns claramente do projeto; usar `.claude/settings.local.json` para patterns que dependem da máquina do usuário (paths absolutos com drive letter, por exemplo). Perguntar quando ambíguo.
- Mostrar diff antes de aplicar. Aguardar OK.

### 6. Registrar como feedback do projeto

Após aplicar (ou não), criar/atualizar feedback no backlog seguindo o pattern lazy de [`../patterns/feedback-loop.md §6`](../patterns/feedback-loop.md):

- Caminho: `<backlog-root>/permissions/YYYY-MM-DD_HHmm.md`
- `producer: permissions-review`
- Em "O que foi feito": resumo (N candidatos, M aprovados, K rejeitados como alto risco).
- Em "Sugestões para docs": se algum pattern aprovado revelou lacuna no [`../patterns/permissions.md`](../patterns/permissions.md) ou no [`../install/permissions-snippet.json`](../install/permissions-snippet.json), sugerir adicionar lá — `docs-review` aplica depois.
- Em "Dificuldades e fricções": se houve confusão entre `settings.json` vs `settings.local.json`, ou pattern que a skill não conseguiu generalizar, registrar.

**Gatilho lazy aplica aqui também:** se a auditoria não encontrou nada para registrar (nenhum pattern, nenhuma sugestão de doc), **não criar arquivo**.

### 7. Detectar padrão recorrente → insight

Se o **mesmo pattern foi adicionado** em 2+ auditorias diferentes (consultar `<backlog-root>/permissions/` histórico), há sinal de:

- Pattern deveria estar no `permissions-snippet.json` do playbook (não só no projeto consumidor) — criar `<insights-root>/YYYY-MM-DD-permissions-<tema>.md` propondo PR no submódulo do playbook.
- OU o filtro de generalização do `permissions.md` está deixando algo escapar — criar insight propondo melhoria no pattern doc.

Insights são fila de discussão; não tomar ação automática.

### 8. Encerramento

> "Revisão de permissões concluída.
> - N candidatos analisados (skill `fewer-permission-prompts`).
> - M aprovados e adicionados a `.claude/settings.json` (P) / `.claude/settings.local.json` (Q).
> - K rejeitados como alto risco (listados abaixo).
> - L registrados em `<backlog-root>/permissions/YYYY-MM-DD_HHmm.md`."

---

## Escopo do permissions-review

**Modifica:**
- `.claude/settings.json` (ou `.claude/settings.local.json`) do projeto consumidor — apenas append/merge na lista `permissions.allow`.
- `.claude/hooks/auto-approve-project-bash.js` — **apenas os whitelists** (Sets de basenames) e, quando for o caso, a lista `LEITURA` de projetos irmãos. Adicionar só basenames de baixo risco (build/test/lint/migration: `vite`, `vitest`, `ok-bridge`, `drizzle-kit`, etc.). Mesmo diff-antes-de-aplicar. NUNCA adicionar comandos de alto risco (`curl` sem restrição de host, `npm install -g`, `git push`, `git reset --hard`) — ver `worktree.md §6.4`. Depois de qualquer mudança, **rodar `hook-test.mjs`**: os casos negativos são o que impede o hook de virar um `allow *`.
- `<backlog-root>/permissions/` — cria registro de feedback quando houver o que registrar.
- `<insights-root>/` — cria insight quando detectar padrão recorrente cross-sessão.

**Não modifica:**
- `~/.claude/settings.json` (global do usuário) — fora do escopo project-level do playbook.
- `packages/ok-playbook/install/permissions-snippet.json` — submódulo é read-only; mudança vai como insight + PR.
- Qualquer outra seção de `settings.json` (env, hooks, etc.) — só `permissions.allow`.

**Nunca:**
- Remove entradas existentes de `permissions.allow`.
- Adiciona pattern classificado como alto risco sem confirmação explícita do usuário (e mesmo assim, preferir continuar pedindo confirmação por execução em vez de incluir no allowlist).
- Roda sem a skill `fewer-permission-prompts` disponível, exceto em modo manual explicitamente aceito.

---

## Regras invariantes

- **Generalização é obrigatória** — pattern hiper-específico (path único, argumento literal) não vai pro allowlist. Aplicar §Generalizar antes de salvar de `permissions.md` sempre.
- **Diff antes de aplicar** — toda mudança em `settings.json` mostra diff e aguarda OK.
- **Parse + merge, nunca concatenação** — duplicar entrada quebra o arquivo silenciosamente.
- **Alto risco para `~/.claude/`, install global, settings globais** — nunca incluir no allowlist; sempre deixar confirmando por execução.
- **Lazy também aqui** — sem candidatos, sem arquivo de feedback.
