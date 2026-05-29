# project-architecture — Índice e Guia de Manutenção

Esta pasta contém a documentação de arquitetura do **<NOME-DO-PROJETO>** — a referência canônica para novos agentes e sessões entenderem o projeto e seguirem suas decisões de design.

**Quando este documento entrar em conflito com o código, o código vence — atualize a documentação.**

> Este `_index.md` segue o pattern canônico [`docs-structure.md`](<playbook-root>/patterns/docs-structure.md) do `ok-playbook`. Mantenha as seções obrigatórias do §5.1 — adapte conteúdo, não estrutura.
>
> **Placeholder `<playbook-root>`:** substitua por onde o `ok-playbook` está instalado neste projeto — `node_modules/ok-playbook` (instalação via pacote, padrão) ou `packages/ok-playbook` (submódulo/monorepo). Todas as referências ao playbook abaixo usam este placeholder.

---

## Estrutura da pasta

```
project-architecture/
├── _index.md               # este arquivo — mapa e regras de manutenção
├── project.md              # visão geral: o que é o projeto, camadas, fluxo principal
├── <dimensão-1>.md         # ex: modules.md — como criar/modificar a dimensão
├── <dimensão-2>.md         # ex: powers.md
├── ...
├── agents/                 # agentes de domínio do projeto
│   └── <nome>.md           # protocolo do agente
├── templates/              # templates do projeto
│   └── ARCHITECTURE.template.md
└── ok-design-architecture/ # (opcional) partners — extensões filosóficas
    └── *-partners.md
```

> **Placeholder de adaptação:** preencher com as dimensões reais do projeto (módulos, powers, frontend, sessões, skills, observabilidade, etc.). Não inventar dimensões — extrair das responsabilidades do código.

---

## Quando ler qual documento

| Você vai... | Leia primeiro |
|---|---|
| Entender o projeto pela primeira vez | `project.md` |
| Verificar conformidade arquitetural | `ok-design-architecture/code-design-partners.md` (se houver) ou `<playbook-root>/patterns/code-design.md` |
| Criar/modificar `<dimensão-1>` (ex: módulo) | `<dimensão-1>.md` → invocar `agents/<dimensão-1>.md` (se existir) |
| Criar/modificar `<dimensão-2>` | `<dimensão-2>.md` → invocar `agents/<dimensão-2>.md` |
| Analisar feedback de agentes e atualizar docs | invocar `<playbook-root>/agents/docs-review.md` |
| Aprovar rascunho e criar novo agente | invocar `<playbook-root>/agents/new-agent.md` |
| Criar worktree ou ajustar permissões | `<playbook-root>/patterns/worktree.md` |
| Trabalhar com superpowers workflow | `<playbook-root>/patterns/superpowers-workflow.md` |

> **Placeholder:** adicionar linhas conforme o projeto cresce. Cada agente domain merece uma linha. Cada dimensão merece uma linha.

---

## Regras de manutenção

### Quando atualizar

| Mudança no código | Documento a revisar |
|---|---|
| Novo princípio arquitetural validado em uso | `code-design-partners.md` (ou pattern canon) |
| Novo padrão adotado na dimensão `<dimensão-1>` | `<dimensão-1>.md` |
| Novo anti-pattern descoberto | `<dimensão>.md §anti-patterns` |
| Mudança no contrato público de um módulo | `<dimensão>.md` |

> **Placeholder:** mapear mudança→doc por dimensão. Ajuda agentes saberem onde mexer.

### Quem atualiza

- **Agente de domínio**: registra fricções em `<backlog-root>/<agente>/` e oferece invocar `docs-review` ao terminar
- **Agente docs-review** (canon, `<playbook-root>/agents/docs-review.md`): lê o feedback e aplica as melhorias
- **Sessão manual**: se identificar inconsistência, atualizar diretamente e documentar no commit

### O que nunca fazer

- Não atualizar por preferência pessoal sem evidência de que o padrão atual não funciona
- Não mesclar detalhes procedurais (como fazer) com decisões arquiteturais (o que é correto)
- Não duplicar conteúdo entre documentos — um tópico tem uma casa canônica

---

## Fluxo de feedback e manutenção

```
agente executa
  → registra fricções em <backlog-root>/<agente>/YYYY-MM-DD_HHmm.md
  → ao terminar, oferece invocar docs-review (canon: <playbook-root>/agents/docs-review.md)

docs-review executa
  → lê todos os feedbacks com status: pending-review
  → identifica gaps nos docs e aplica melhorias
  → detecta padrões recorrentes sem skill → cria <drafts-root>/<nome>.md
  → marca feedbacks como reviewed
  → cria <insights-root>/ para lacunas arquiteturais
  → oferece promoção upstream pro ok-playbook (canon §7)

usuário revisa <drafts-root>/
  → aprova (status: approved), ajusta ou descarta

new-agent executa (com rascunho aprovado, canon: <playbook-root>/agents/new-agent.md)
  → cria agents/<nome>.md + .claude/skills/<nome>/SKILL.md
  → atualiza _index.md
  → arquiva o rascunho (status: implemented)
```

---

## Estrutura em `<docs-root>/` relacionada

```
<docs-root>/                            # default: docs/
├── project-architecture/               # <arch-root> — esta pasta
├── superpowers/                        # <superpowers-root> — ciclo de specs/planos
│   ├── drafts/                         # rascunhos de feature
│   ├── specs/{,done/}                  # specs ativas + arquivadas
│   └── plans/{,done/}                  # planos ativos + arquivados
├── agent-feedback/                     # <backlog-root>
│   ├── _template.md
│   └── <agente>/
├── _drafts/                            # <drafts-root>
│   ├── _template.md
│   └── YYYY-MM-DD-<nome>.md
└── insights/                           # <insights-root>
    ├── _template.md
    ├── YYYY-MM-DD-<tema>.md
    └── upstream-proposals/             # (se modo `request`)
```

### Ciclo de vida de specs e planos

| Momento | Ação |
|---|---|
| Ideia aprovada em brainstorm, mas sem spec ainda | Criar `<superpowers-root>/drafts/YYYY-MM-DD-<nome>.md` |
| Spec commitada e aprovada pelo usuário | Começar plano; mover spec para `specs/done/` |
| Execução do plano concluída (implementer finalizado) | Mover plano para `plans/done/` |

**Regra:** Specs não ficam ativas depois que o plano existe. Planos não ficam ativos depois que a execução termina.

`<insights-root>/` é o registro de evoluções futuras, ideias e lacunas identificadas — distinto de logs runtime do projeto.
