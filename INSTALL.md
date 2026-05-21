# Instalação do ok-playbook num projeto consumidor

Este documento é lido pela LLM (Claude Code) ao executar a instalação do playbook num projeto que o consome. Pode também ser seguido manualmente.

> **Para o agente que está lendo isto:** este é o protocolo de instalação. Siga §1 → §6 em ordem. Pergunte ao usuário antes de aplicar cada mudança *estrutural* (passos 3, 4, 5). O passo 6 (gerar `OKPLAYBOOK.md`) sempre roda e é o seu relatório final.

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

- **Patterns** (`packages/ok-playbook/patterns/*.md`) — princípios agnósticos: code-design, worktree, feedback-loop, agent, subagent-dispatch.
- **Agents** (`packages/ok-playbook/agents/*.md`) — protocolos agnósticos: docs-review, new-agent.
- **Templates** (`packages/ok-playbook/templates/*.md`) — feedback, draft, insight, ARCHITECTURE.

Pergunte:

> "Quer instalar **tudo** ou selecionar apenas alguns componentes? (Recomendado: tudo na primeira instalação.)"

A escolha do usuário define o escopo dos passos 2-5.

---

## 2. Decidir paths agnósticos

O playbook usa placeholders `<backlog-root>`, `<drafts-root>`, `<insights-root>`, `<docs-root>`, `<agents-root>`. Pergunte ao usuário (com defaults razoáveis):

| Placeholder | Default sugerido |
|---|---|
| `<backlog-root>` | `docs/agent-feedback/` |
| `<drafts-root>` | `docs/_drafts/` |
| `<insights-root>` | `docs/insights/` |
| `<docs-root>` | `dev-prompts/project-architecture/` ou `docs/architecture/` |
| `<agents-root>` | `<docs-root>/agents/` |

> "Vou usar estes paths como default: `docs/agent-feedback/`, `docs/_drafts/`, `docs/insights/`, `dev-prompts/project-architecture/`. OK ou quer ajustar?"

Anote a resposta — ela vai entrar no `OKPLAYBOOK.md` (§6) e ser usada para criar os arquivos vazios em §3.

---

## 3. Criar a estrutura de pastas e templates

Para cada path escolhido em §2, criar pasta vazia e copiar template canônico:

```
<backlog-root>/
└── _template.md                ← cópia de packages/ok-playbook/templates/feedback.md

<drafts-root>/
└── _template.md                ← cópia de packages/ok-playbook/templates/draft.md

<insights-root>/
└── _template.md                ← cópia de packages/ok-playbook/templates/insight.md
```

Se as pastas já existem, **não sobrescrever** templates existentes — pergunte ao usuário:

> "Já existe `<backlog-root>/_template.md`. Sobrescrever com o template do playbook (pode ter divergido) ou manter o atual?"

---

## 4. Configurar `CLAUDE.md` do consumidor

Ler `CLAUDE.md` do projeto consumidor (criar se não existir). Propor inserção do snippet de [`install/claude-md-snippet.md`](./install/claude-md-snippet.md), adaptado:

- Substituir placeholders pelos paths definidos em §2.
- Posicionar **no topo** do CLAUDE.md (depois de outras instruções de boot, antes das específicas do projeto).
- Se já houver bloco "ok-playbook" no CLAUDE.md, é update — substituir o bloco existente.

Mostrar diff antes de aplicar. Aguardar OK do usuário.

---

## 5. Configurar `.claude/settings.json` (permissões)

Ler `.claude/settings.json` (ou `.claude/settings.local.json`) do consumidor. Mesclar permissões de [`install/permissions-snippet.json`](./install/permissions-snippet.json):

- Permissões path-agnostic (já estão no snippet) entram direto.
- Permissões `cd <worktree> && *` exigem path do projeto — pergunte se o usuário quer que você as gere agora (precisa de drive + path) ou pular pra configurar com a skill `update-config` depois.

Mostrar diff antes de aplicar.

> **Importante:** não duplicar entradas existentes. Use a estrutura JSON real (parse + merge), não concatenação de texto.

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
- Próximos passos manuais sugeridos (ex: "configure permissões de worktree com `update-config`", "instale agentes de domínio").

Se já existir `OKPLAYBOOK.md`, é update — preserve o histórico (mover para `OKPLAYBOOK.history/<timestamp>.md` antes de sobrescrever).

---

## 7. Encerramento

Confirmar com o usuário:

> "ok-playbook instalado. Componentes ativos: [lista]. Próximos passos manuais documentados em `OKPLAYBOOK.md`. Quer que eu também copie as skills dos agentes (`docs-review`, `new-agent`) para `.claude/skills/`?"

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
