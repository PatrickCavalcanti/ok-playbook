# Instalação do ok-playbook num projeto consumidor

Este documento é lido pela LLM (Claude Code) ao executar a instalação do playbook num projeto que o consome. Pode também ser seguido manualmente.

> **Para o agente que está lendo isto:** este é o protocolo de instalação. Siga §1 → §8 em ordem. Pergunte ao usuário antes de aplicar cada mudança *estrutural* (passos 3, 4, 5, 7). O passo 6 (gerar `OKPLAYBOOK.md`) sempre roda e é o seu relatório final.

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

- **Patterns project-level** (`packages/ok-playbook/patterns/*.md`):
  - Princípios agnósticos: `code-design`, `worktree`, `feedback-loop`, `agent`, `subagent-dispatch`.
  - Configuração do harness: `git`, `profiles`, `permissions`.
- **Patterns user-level** (vão em `~/.claude/CLAUDE.md`): `memory`, `superpowers-workflow`.
- **Agents** (`packages/ok-playbook/agents/*.md`) — protocolos agnósticos: `docs-review`, `new-agent`.
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

## 5. Configurar `.claude/settings.json` (permissões)

Ler `.claude/settings.json` (ou `.claude/settings.local.json`) do consumidor. Mesclar permissões de [`install/permissions-snippet.json`](./install/permissions-snippet.json):

- O snippet atual já inclui items seguros universais (`Bash(git *)`, `Bash(node *)`, `Bash(npm *)`, leitura/edição local, worktree path-agnostic, Windows `mklink`, `WebSearch`). Entram direto.
- Variantes path-specific de worktree (8 quotings com drive + nome do projeto) **não** estão no snippet. INSTALL pergunta:
  - "Quer que eu gere agora as 8 variantes de worktree pra este projeto? Preciso de drive (`e`, `c`...) e nome do projeto (path absoluto)."
  - Se sim, gerar inline e mesclar.
  - Se não, registrar em `OKPLAYBOOK.md` como próximo passo manual com `update-config`.
- Items domínio-específicos (`curl -s http://localhost:<porta>`, `docker exec *`, `DATABASE_URL=... node --test *`) ficam pro `update-config` aplicar conforme uso.

Mostrar diff antes de aplicar. Importante: não duplicar entradas — parse + merge, não concatenação.

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
- Se setup user-level (§7) foi aplicado e em qual `~/.claude/CLAUDE.md`.
- Próximos passos manuais sugeridos (ex: "configure permissões de worktree com `update-config`", "instale agentes de domínio").

Se já existir `OKPLAYBOOK.md`, é update — preserve o histórico (mover para `OKPLAYBOOK.history/<timestamp>.md` antes de sobrescrever).

---

## 7. (Opcional) Setup user-level

> **Atenção:** este passo modifica `~/.claude/CLAUDE.md` do usuário, que afeta TODOS os projetos do mesmo usuário no mesmo computador. Pedir confirmação explícita e mostrar diff antes de aplicar.

Perguntar:

> "Quer também aplicar os blocos user-level (memory + superpowers-workflow) em sua `~/.claude/CLAUDE.md` global? Isso afeta todos os seus projetos no mesmo computador."

Se sim:

1. Ler `~/.claude/CLAUDE.md` (criar se não existir).
2. Detectar se já existe um bloco delimitado por `## ok-playbook (user-level)` — se sim, é update; substituir.
3. Mostrar diff do conteúdo de [`install/global-claude-md-snippet.md`](./install/global-claude-md-snippet.md).
4. Aplicar com OK do usuário.
5. Registrar em `OKPLAYBOOK.md` (§6).

Se não:

- Registrar em `OKPLAYBOOK.md` que setup user-level foi pulado nesta instalação. Pode ser aplicado depois rodando este §7 isoladamente.

---

## 8. Encerramento

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
