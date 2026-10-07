# Memory — Sistema de Memórias Persistente

> **Escopo:** project-level. O resumo da tipologia entra no `CLAUDE.md` do projeto via o bloco de regras do playbook. Este doc é a referência detalhada.

O Claude Code (harness) oferece um sistema de memória persistente: arquivos em `~/.claude/projects/<projeto-encoded>/memory/` carregados automaticamente como contexto entre sessões. **O sistema é project-scoped por design** (uma pasta por projeto), então a tipologia canônica também vive a nível de projeto — cada projeto que adota o playbook pode ajustar a sua. Este pattern define **a tipologia padrão da OK** — categorias, formato, anti-patterns.

---

## Tipologia canônica (4 tipos)

| Tipo | Quando salvar | Como usar |
|---|---|---|
| `user` | Detalhes sobre papel/preferências/conhecimento do usuário | Tailorar respostas ao perfil (ex: explicar React em termos de Go pra dev backend) |
| `feedback` | Correção do usuário OU confirmação de approach não-óbvio | Não repetir erros; manter approaches validados |
| `project` | Decisões/iniciativas/contexto que não aparece no código/git | Informar sugestões dentro do projeto |
| `reference` | Ponteiros pra sistemas externos (Linear, dashboards, canais) | Saber onde buscar info que não está no projeto |

Exemplos por tipo:

- **user:** "user é data scientist focado em observability" — usar pra discutir logs com vocabulário da área.
- **feedback:** "não mockar DB nesses tests" + **Why:** "prod migration quebrou no Q1" + **How to apply:** "tests de integração no path do migrate sempre rodam contra DB real".
- **project:** "merge freeze após 2026-03-05" + **Why:** "mobile team cortando release" + **How to apply:** "PRs não-críticos esperam até 2026-03-12".
- **reference:** "bugs de pipeline tracked no Linear project 'INGEST'".

---

## Estrutura: índice + arquivos individuais

`MEMORY.md` é o índice: uma linha por memória, ~150 chars máximo, formato `- [Title](file.md) — hook curto`. Sem frontmatter no índice.

Arquivos individuais têm frontmatter:

```yaml
---
name: kebab-case-slug
description: uma linha — usada pra decidir relevância em conversas futuras
metadata:
  type: user | feedback | project | reference
---
```

---

## Corpo para `feedback` e `project`

Sempre estruturar: regra/fato + linha `**Why:**` (motivo, geralmente um incidente ou preferência forte) + linha `**How to apply:**` (quando/onde a regra aciona). Sem o *why* a regra cega; com ele dá pra julgar edge cases.

Exemplo:

> "não mockar DB nesses tests"
> **Why:** prod migration quebrou no Q1 porque mock escondia incompatibilidade de schema.
> **How to apply:** tests de integração no path do migrate sempre rodam contra DB real.

---

## Linking

`[[name]]` referencia outra memória pelo `name:` slug. Link pra memória inexistente é OK — marca algo a escrever depois, não é erro. Linkar liberalmente.

---

## O que NÃO salvar

- Code patterns, arquitetura, file paths, estrutura do projeto (derivável do código).
- Git history, who-changed-what (autoritativo via `git log`/`git blame`).
- Debugging solutions ou fix recipes (a fix está no código; o contexto está no commit).
- Qualquer coisa já documentada em CLAUDE.md.
- Detalhes efêmeros de task em progresso.

Anti-pattern comum: "salva esta lista de PRs". Resposta correta: perguntar o que foi *surpreendente* ou *não-óbvio* — essa é a parte que vale memória.

---

## Quando acessar memórias

Acessar quando relevantes ao contexto da conversa; quando o usuário referencia conversa prévia; **sempre** quando pede pra checar ou lembrar algo. Se usuário diz "ignore memória", não aplicar.

---

## Antes de recomendar a partir de memória

Memória que cita função/file/flag específico é claim de "isso existia quando a memória foi escrita" — pode ter sido removido. Verificar antes de recomendar ação: o file existe? o grep retorna? Memória de snapshot de estado (activity log, arquitetura) está congelada — pra "current/recent", preferir `git log` ou leitura do código.

---

## Memória vs outras persistências

- **Plano** (writing-plans) — alinhamento em implementação não-trivial; vive na sessão.
- **Tasks** (TodoWrite) — passos discretos da sessão.
- **Memória** — fato útil em sessões futuras.
