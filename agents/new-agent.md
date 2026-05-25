---
description: "Criar um novo agente a partir de um rascunho aprovado em <drafts-root>/. Gera o arquivo de protocolo, a skill do Claude Code e atualiza o índice."
agent: "agent"
argument-hint: "Caminho do rascunho aprovado em <drafts-root>/ (ex: docs/_drafts/2026-05-01-meu-agente.md)"
---

# Agente — Criação de Novo Agente

Materializa um rascunho aprovado em `<drafts-root>/` na estrutura completa: protocolo em `<agents-root>/`, skill em `.claude/skills/`, entrada no índice de docs.

**Referência canônica:** [`../patterns/agent.md §7`](../patterns/agent.md).

**Pré-requisito:** o rascunho deve ter `status: approved`. Se ainda estiver como `draft`, pare e peça ao usuário para revisar e aprovar antes de continuar.

---

## 0. Feedback (lazy)

**Não criar arquivo no boot.** Quando ocorrer a primeira fricção, correção do usuário ou ambiguidade estruturada nesta execução, criar `<backlog-root>/new-agent/YYYY-MM-DD_HHmm.md` a partir do template em `<backlog-root>/_template.md` e registrar nesse momento. Itens subsequentes anexam ao mesmo arquivo. Se a execução não tiver fricção, nenhum arquivo é criado.

Ver [`../patterns/feedback-loop.md §6`](../patterns/feedback-loop.md) para o protocolo completo do gatilho lazy.

---

## 1. Ler e validar o rascunho

1. Ler o arquivo de rascunho indicado
2. Confirmar `status: approved`
3. Verificar se o escopo não duplica agente existente — comparar com os agentes em `.claude/skills/`
   - Se houver sobreposição significativa: pausar e perguntar ao usuário se deve prosseguir ou ajustar escopo
4. Confirmar que o protocolo proposto tem pelo menos: propósito claro, pré-flight, passos de execução e regras invariantes

---

## 2. Criar o arquivo de protocolo

Criar `<agents-root>/<nome>.md` com o protocolo do rascunho, refinado para seguir o padrão dos agentes existentes:

- Frontmatter com `description`, `agent: "agent"`, `argument-hint`
- Seção de abertura de feedback (§0 de todo agente)
- Protocolo de execução com checklists quando aplicável
- Registro contínuo de fricções durante a execução
- Seção de encerramento com oferta de invocar `docs-review`
- Regras invariantes

Referência de formato: outros agentes em `<agents-root>/` que já sigam o padrão.

---

## 3. Criar a skill do Claude Code

Criar `.claude/skills/<nome>/SKILL.md`:

```yaml
---
description: "<descrição do rascunho>"
when_to_use: "<when_to_use do rascunho>"
---

Leia e siga o protocolo completo em `<agents-root>/<nome>.md`.
```

Verificar que `description` e `when_to_use` são específicos o suficiente para não colidir com skills existentes.

---

## 4. Atualizar o índice

No `_index.md` do projeto (ou equivalente):

1. Adicionar linha na estrutura de pastas em `agents/`
2. Adicionar linha na tabela "Quando ler qual documento"
3. Adicionar linha na tabela "Quando atualizar" se o novo agente introduzir um novo tipo de mudança

---

## 5. Arquivar o rascunho

Atualizar o arquivo em `<drafts-root>/`:

```yaml
status: implemented
implemented-at: YYYY-MM-DD
agent-file: <agents-root>/<nome>.md
skill-file: .claude/skills/<nome>/SKILL.md
```

Não deletar o rascunho — ele serve como histórico de decisão.

---

## 6. Encerramento

Finalizar o arquivo de feedback com resumo do que foi feito e sugestões de melhoria para este protocolo.

Perguntar ao usuário:

> "Agente criado. Quer que eu invoque o `docs-review` para verificar se a criação revelou algum gap na documentação de arquitetura?"

---

## Regras invariantes

- Nunca criar agente com `status: draft` — exige aprovação explícita
- Nunca criar agente cujo escopo já é coberto por outro existente sem confirmação do usuário
- O arquivo de protocolo deve seguir o padrão dos agentes existentes — não improvisar formato
- O índice deve ser atualizado na mesma sessão — não deixar para depois
