# Instalação do ok-playbook num projeto consumidor

Este documento é lido pela LLM (Claude Code) ao executar a instalação do playbook num projeto que o consome. Pode também ser seguido manualmente.

> **Para o agente que está lendo isto:** este é o protocolo de instalação. Siga §1 → §7 em ordem. Pergunte ao usuário antes de aplicar cada mudança *estrutural* (passos 3, 4, 5). O passo 6 (gerar `OKPLAYBOOK.md`) sempre roda e é o seu relatório final.
>
> **Importante:** este playbook é estritamente **project-level**. Nenhum passo modifica `~/.claude/CLAUDE.md`, `~/.claude/settings.json` ou qualquer arquivo fora do projeto consumidor. Se o usuário pedir setup global, recuse e explique que decisões da OK valem por projeto, não por usuário.

---

## 0. Pré-requisitos

Antes de começar, confirme:

- [ ] O `ok-playbook` está presente em `packages/ok-playbook/` (submódulo ou copy) com pelo menos `patterns/`, `agents/`, `templates/`, `install/`.
- [ ] O projeto consumidor tem `git init` e pelo menos um commit.
- [ ] Se houver `OKPLAYBOOK.md` no root do consumidor, é uma **reinstalação/upgrade** — confirme com o usuário antes de sobrescrever (§6).

Se não for reinstalação, perguntar:

> "Vou instalar o ok-playbook neste projeto. Vou propor mudanças em: (1) `CLAUDE.md` do projeto, (2) `.claude/settings.json` (permissões), (3) `.claude/skills/` (skills dos agentes), (4) criar `OKPLAYBOOK.md` no root. Posso seguir?"

---

## 1. Inventário do que o playbook traz

Liste para o usuário o que está disponível neste playbook (lendo `packages/ok-playbook/`):

- **Patterns** (`packages/ok-playbook/patterns/*.md`) — todos project-level:
  - Princípios agnósticos: `code-design`, `worktree`, `feedback-loop`, `agent`, `subagent-dispatch`.
  - Configuração do harness: `git`, `profiles`, `permissions`.
  - Tipologia/workflow: `memory` (tipologia de memórias do projeto), `superpowers-workflow` (roteamento Opus/Sonnet e cadência de reviews).
  - Organização de docs: `docs-structure` (hierarquia `<docs-root>` + `_index.md` + ciclo de specs/planos).
- **Agents** (`packages/ok-playbook/agents/*.md`) — protocolos agnósticos: `docs-review`, `new-agent`, `playbook-audit`, `permissions-review`, `playbook-contribute`.
- **Templates** (`packages/ok-playbook/templates/*.md`) — feedback, draft, insight, ARCHITECTURE, `_index` (esqueleto do mapa central da arq).

Pergunte:

> "Quer instalar **tudo** ou selecionar apenas alguns componentes? (Recomendado: tudo na primeira instalação.)"

A escolha do usuário define o escopo dos passos 2-5.

---

## 2. Decidir paths agnósticos

O playbook usa 7 placeholders. Layout canônico em [`patterns/docs-structure.md §3`](./patterns/docs-structure.md) — pai único `<docs-root>`, com os outros como sub-pastas. Pergunte ao usuário (com defaults razoáveis):

| Placeholder | Default sugerido |
|---|---|
| `<docs-root>` | `docs/` |
| `<arch-root>` | `<docs-root>/project-architecture/` |
| `<agents-root>` | `<arch-root>/agents/` |
| `<superpowers-root>` | `<docs-root>/superpowers/` |
| `<backlog-root>` | `<docs-root>/agent-feedback/` |
| `<drafts-root>` | `<docs-root>/_drafts/` |
| `<insights-root>` | `<docs-root>/insights/` |

> "Vou usar estes paths como default — todos sob `docs/`, conforme `patterns/docs-structure.md`: `docs/project-architecture/` para arq, `docs/superpowers/` para specs/planos, `docs/agent-feedback/`, `docs/_drafts/`, `docs/insights/`. OK ou quer ajustar?"

Anote a resposta — ela vai entrar no `OKPLAYBOOK.md` (§6) e ser usada para criar os arquivos vazios em §3.

### 2.1 Modo de contribuição upstream

Perguntar ao usuário **agora**, durante a instalação — assim o `playbook-contribute` já sabe operar quando for invocado depois:

> "Como este projeto contribui de volta pro `ok-playbook` quando descobre algo genérico que vale virar canon?
> 1. **`direct`** — eu (ou meu time) tenho push direto na main do playbook (mantenedor / projetos pessoais).
> 2. **`branch-pr`** — temos git access ao repo do playbook, mas mudanças vão por branch + merge request (default pra times).
> 3. **`request`** — não temos git access; mudanças viram artefato pra mantenedor aplicar (consumidor externo).
> 4. **`unknown`** — pular agora, pergunto na primeira vez que `playbook-contribute` for invocado."

Anotar a resposta — vai pro campo "Modo de contribuição upstream" do `OKPLAYBOOK.md` (§6). Detalhes operacionais de cada modo em [`agents/playbook-contribute.md`](./agents/playbook-contribute.md).

---

## 3. Criar a estrutura de pastas e templates

Para cada path escolhido em §2, criar pasta vazia e copiar template canônico. Layout completo em [`patterns/docs-structure.md §3`](./patterns/docs-structure.md):

```
<backlog-root>/
└── _template.md                ← cópia de packages/ok-playbook/templates/feedback.md

<drafts-root>/
└── _template.md                ← cópia de packages/ok-playbook/templates/draft.md

<insights-root>/
└── _template.md                ← cópia de packages/ok-playbook/templates/insight.md

<arch-root>/                    ← MAPA da arquitetura
├── _index.md                   ← cópia de packages/ok-playbook/templates/_index.template.md
│                                  (adaptar placeholders <NOME-DO-PROJETO>, <dimensão-N>)
├── agents/                     ← vazio na instalação; preenchido conforme o projeto cria agentes
└── templates/
    └── ARCHITECTURE.template.md ← cópia de packages/ok-playbook/templates/ARCHITECTURE.md

<superpowers-root>/             ← ciclo de vida de specs/planos
├── drafts/                     ← vazio
├── specs/
│   └── done/                   ← vazio
└── plans/
    └── done/                   ← vazio
```

**Sobre `<arch-root>/_index.md`:** o template canônico tem placeholders `<NOME-DO-PROJETO>`, `<dimensão-N>`, etc. Perguntar ao usuário pra preencher o nome do projeto e as 2-3 dimensões principais (módulos? powers? frontend? services?). Se o usuário não souber ainda, deixar os placeholders e marcar pra preencher depois.

**Pastas vazias do `<superpowers-root>/`:** Git ignora pastas vazias. Pra preservar a estrutura no commit, usar `.gitkeep`:

```
<superpowers-root>/drafts/.gitkeep
<superpowers-root>/specs/done/.gitkeep
<superpowers-root>/plans/done/.gitkeep
```

**Se `docs-structure.md` foi aceito (§1):** o scaffolding acima cobre o pattern automaticamente. Se NÃO foi aceito, pular a criação de `<arch-root>/` e `<superpowers-root>/` — projeto vai usar layout próprio fora do canon.

**Se `profiles.md` foi aceito (§1):** copiar os 3 perfis canônicos pra `.claude/profiles/`:

```
.claude/profiles/
├── dev-early.md       ← cópia da seção ### dev-early de patterns/profiles.md
├── dev-stable.md      ← cópia da seção ### dev-stable de patterns/profiles.md
└── review.md          ← cópia da seção ### review de patterns/profiles.md
```

Como `profiles.md` no playbook é um arquivo único com as 3 seções, **extrair cada seção pra um arquivo separado** mantendo o conteúdo. Atenção à hierarquia de headings: `profiles.md` usa `### dev-early` com sub-seções `#### Comportamento Geral`, etc. Ao materializar arquivos individuais, **promover** `####` → `##` (e descartar o `###` raiz, substituindo pelo `#` do título do arquivo). Se algum perfil já existe em `.claude/profiles/`, perguntar antes de sobrescrever.

**Se `git.md` foi aceito (§1):** copiar pra `.claude/context/git-rules.md`. Se já existir, perguntar antes de sobrescrever.

> **Sobre a fonte canônica.** O arquivo `packages/ok-playbook/patterns/git.md` é a **fonte canônica** — atualiza junto com o submódulo. A cópia em `.claude/context/git-rules.md` existe pra compatibilidade com agentes/skills que esperam encontrar regras git no path padrão `.claude/context/`. Em divergência, o playbook vence — re-copiar a partir dele. O CLAUDE.md gerado pelo `claude-md-snippet.md` aponta pro playbook (fonte canônica); a cópia local é conveniência operacional, não fonte de verdade.

Se as pastas já existem, **não sobrescrever** templates existentes — pergunte ao usuário:

> "Já existe `<backlog-root>/_template.md`. Sobrescrever com o template do playbook (pode ter divergido) ou manter o atual?"

---

## 4. Configurar `CLAUDE.md` do consumidor

Ler `CLAUDE.md` do projeto consumidor (criar se não existir). Propor inserção do snippet de [`install/claude-md-snippet.md`](./install/claude-md-snippet.md), adaptado:

Versão atual do snippet inclui: bloco "Antes de começar" (escolha de perfil), ponteiros pros 5 patterns novos, regras invariantes do playbook, e bloco "Registro de feedback de sessão" (gatilho lazy). Diff completo é visível no próprio `install/claude-md-snippet.md`.

- Substituir placeholders pelos paths definidos em §2.
- Posicionar **no topo** do CLAUDE.md (depois de outras instruções de boot, antes das específicas do projeto).
- Se já houver bloco "ok-playbook" no CLAUDE.md, é update — substituir o bloco existente.

Mostrar diff antes de aplicar. Aguardar OK do usuário.

---

## 5. Configurar `.claude/settings.json` (permissões + hook)

Esta etapa tem **duas partes**: as permissões path-agnostic em `permissions.allow` e o **PreToolUse hook** que cobre comandos compound em worktree (substitui o approach obsoleto de 8 regras `cd <path> && *` por variante de quoting). Detalhes do rationale em [`patterns/worktree.md §6`](./patterns/worktree.md) e [`patterns/permissions.md §Quando rules não bastam`](./patterns/permissions.md).

### 5.1 Mesclar permissões

Ler `.claude/settings.json` (ou `.claude/settings.local.json`) do consumidor. Mesclar permissões de [`install/permissions-snippet.json`](./install/permissions-snippet.json):

- O snippet já inclui items seguros universais (`Bash(git *)`, `Bash(node *)`, `Bash(npm *)`, leitura/edição local, worktree path-agnostic `git worktree *` + `git -C *.worktrees/* *`, Windows `mklink`, `WebSearch`). Entram direto.
- Items domínio-específicos (`curl -s http://localhost:<porta>`, `docker exec *`, `DATABASE_URL=... node --test *`) ficam pro [`permissions-review`](./agents/permissions-review.md) aplicar conforme uso.

Mostrar diff antes de aplicar. Importante: não duplicar entradas — parse + merge, não concatenação.

### 5.2 Instalar o hook de worktree

Pra worktree não pedir prompt em comandos comuns (`cd <wt> && git status`, etc.):

1. **Perguntar ao usuário** o `<PROJECT_PATH>` (path do projeto a partir do drive, lowercase, forward-slashes):
   > "Pra parametrizar o hook de worktree, preciso do path do seu projeto a partir do drive, em lowercase e forward-slash. Ex: se o projeto está em `e:/Projetos/Igris`, o valor é `projetos/igris`. Qual é o seu?"
2. **Copiar o template** de [`install/hooks/auto-approve-worktree-bash.js`](./install/hooks/auto-approve-worktree-bash.js) para `.claude/hooks/auto-approve-worktree-bash.js`, **substituindo `<PROJECT_PATH>`** pelo valor que o usuário deu.
3. **Mesclar o bloco `hooks`** do snippet em [`install/permissions-snippet.json`](./install/permissions-snippet.json) no `.claude/settings.json` do consumidor (chave top-level `hooks`, append/merge em `PreToolUse[]`).
4. **Hook entra em vigor sem reload window** (descoberta empírica). Rules em `permissions.allow` precisam de reload — avise o usuário se houver dúvida.

Se o usuário **NÃO usa worktrees** neste projeto, pular 5.2 inteiro e registrar em `OKPLAYBOOK.md` como "hook de worktree não instalado".

### 5.3 Verificar

Pedir ao usuário pra rodar um comando de teste numa worktree existente (se houver) — `cd "<worktree-path>" && git status`. Deve passar **sem prompt**. Se prompted, conferir:

- `.claude/hooks/auto-approve-worktree-bash.js` existe e o `<PROJECT_PATH>` foi substituído corretamente?
- Bloco `hooks.PreToolUse` em `.claude/settings.json` aponta pro path correto?
- Node está em PATH?

---

## 6. Gerar `OKPLAYBOOK.md` no root do consumidor

Sempre rodar. Este arquivo é o **manifesto da instalação** — fica no root do projeto consumidor e descreve o que foi instalado, com qual versão, com quais paths customizados.

Template em [`install/okplaybook-template.md`](./install/okplaybook-template.md). Preencher:

- Versão do playbook (commit SHA do submódulo se aplicável).
- Data da instalação.
- Componentes ativos (lista escolhida em §1).
- Paths customizados (de §2).
- Mudanças em `CLAUDE.md` (de §4).
- Permissões adicionadas (de §5).
- Quais perfis foram copiados pra `.claude/profiles/` (dev-early/stable/review).
- Se `git-rules.md` foi instalado em `.claude/context/`.
- **Modo de contribuição upstream** (de §2.1).
- Próximos passos manuais sugeridos (ex: "configure permissões de worktree com `update-config`", "instale agentes de domínio").

Se já existir `OKPLAYBOOK.md`, é update — preserve o histórico (mover para `OKPLAYBOOK.history/<timestamp>.md` antes de sobrescrever).

---

## 7. Encerramento

Confirmar com o usuário:

> "ok-playbook instalado. Componentes ativos: [lista]. Próximos passos manuais documentados em `OKPLAYBOOK.md`. Quer que eu também copie as skills dos agentes (`docs-review`, `new-agent`, `playbook-audit`, `permissions-review`, `playbook-contribute`) para `.claude/skills/`?"

Lembrar ao usuário sobre o **fluxo de upgrade**:

> "Quando o ok-playbook receber atualizações, rode `git submodule update --remote packages/ok-playbook` e depois peça **'revalida o ok-playbook'** — o agente `playbook-audit` mostra o drift item a item e você decide o que atualizar. Esse é o caminho oficial de upgrade; não é mais necessário rodar este INSTALL.md de novo."

Se sim, para cada agente em `packages/ok-playbook/agents/`, criar `.claude/skills/<nome>/SKILL.md` apontando para o protocolo do playbook:

```yaml
---
description: "<descrição extraída do frontmatter do protocolo>"
when_to_use: "<gatilho específico — derivado do propósito do agente>"
---

Leia e siga o protocolo completo em `packages/ok-playbook/agents/<nome>.md`.
```

---

## Regras invariantes da instalação

- **Nunca sobrescreva CLAUDE.md, settings.json ou OKPLAYBOOK.md sem mostrar diff e pedir OK.**
- **Nunca rode `npm install` ou similar como parte da instalação** — o playbook é doc-only, sem deps.
- **Nunca delete arquivos existentes do consumidor.** Em conflito, sempre pergunte.
- **Sempre gere `OKPLAYBOOK.md`** — é o registro de auditoria da instalação; mesmo install parcial precisa dele.
- **Sempre liste no `OKPLAYBOOK.md`** o que foi pulado e por quê (se o usuário escolheu instalar parcial).
