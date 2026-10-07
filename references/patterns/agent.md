# Agent Partners

> **Padrão de processo, project-agnostic.** Define quando criar um agente, como estruturá-lo, e como compor seu ciclo de vida com o [`feedback-loop`](./feedback-loop.md). Foco no *contrato do agente* — não em conteúdo de domínio.
>
> **Quando este documento entrar em conflito com a prática, a prática vence — atualize o documento.**

---

## 1. Propósito

Trabalho repetitivo que segue um protocolo (criar um power, revisar um módulo, diagnosticar uma sessão, verificar um padrão de design) merece virar agente. Sem agente, cada execução improvisa pré-flight, checklist, encerramento — e perde a oportunidade de evoluir o próprio protocolo.

Um agente, no sentido deste doc, é um **par {protocolo + skill}**: um arquivo Markdown que descreve passos, regras e checklists, e uma entrada na descoberta de skills do Claude Code (ou equivalente) que o torna invocável.

Este doc serve a três usos:

1. **Direcionar** quem está prototipando um agente — saber o que é obrigatório, o que é convenção, e como fechar o ciclo.
2. **Verificar** se um agente existente segue o padrão — checklist auto-aplicável.
3. **Adaptar** o padrão para um projeto novo — qual a estrutura mínima de pastas e qual o trio canônico de agentes.

**Pré-requisito**: leia [`feedback-loop.md`](./feedback-loop.md) primeiro. Todo agente é um *produtor* no sentido daquele doc — herda o template, a regra do registro contínuo, e a oferta de invocar o processador.

---

## 2. Como usar este doc

**Modo criação.** Antes de propor um agente novo, leia §3 (sinais que justificam) e §7 (ciclo de vida). O agente só nasce depois de um rascunho aprovado — esta seção decide se vale rascunhar.

**Modo verificação.** Rode o checklist do §11 contra um agente existente.

---

## 3. Quando criar um agente

Sinais que justificam um agente novo (todos os três presentes):

1. **Categoria de tarefa recorrente** — 2+ execuções no histórico que seguiram passos parecidos.
2. **Necessidade de orientação humana repetida** — usuário precisou guiar passos que poderiam ter sido protocolares.
3. **Sem cobertura por agente existente** — nenhum agente atual cobre o trabalho sem improviso.

Quando faltam sinais — mas o trabalho ainda merece padronização — alternativas:

| Situação | Use |
|---|---|
| Conhecimento descritivo, sem protocolo de execução | Documento de arquitetura (capítulo em `<docs-root>/`) |
| Protocolo executável mas raríssimo (1×/ano) | Receita inline no doc de arquitetura |
| Decisão pontual que vale registrar | Insight em `<insights-root>/` |
| Padrão de execução de subagentes (não agente principal) | Ver [`subagent-dispatch.md`](./subagent-dispatch.md) |

**Agente é caro**: ocupa espaço no catálogo, exige manutenção, compete por atenção da LLM no momento de escolher skill. Só vale quando o sinal é claro.

---

## 4. Anatomia de um agente

Um agente é um arquivo Markdown com estrutura previsível. Adapta o conteúdo ao domínio, mantém a forma.

### 4.1 Frontmatter (MUST)

```yaml
---
description: "<frase curta — o que o agente faz>"
agent: "agent"
argument-hint: "<o que o invocador deve passar como argumento (ou 'deixe em branco')>"
---
```

`description` precisa ser específica o suficiente para a LLM diferenciar de outros agentes na hora de escolher skill.

### 4.2 Seções obrigatórias

| Seção | Conteúdo |
|---|---|
| Abertura | Resumo de 1-3 frases do agente, link para o(s) doc(s) de arquitetura que ele segue |
| **§0 — Abrir arquivo de feedback** | Cria `<backlog-root>/<agente>/YYYY-MM-DD_HHmm.md`. Obrigatório como **primeira ação** |
| Pré-flight | Decisões iniciais: é mesmo escopo deste agente? Modo de operação? Argumentos necessários? |
| Protocolo de execução | Passos numerados ou checklists. Quando aplicável, separar por modo (criação / revisão / migração) |
| Registro contínuo | Lembrete explícito da regra do feedback-loop (§6 daquele doc) |
| Encerramento | Finalizar o arquivo de feedback, oferecer invocar o processador (`docs-review` ou equivalente) |
| Regras invariantes | Lista curta de "nunca faça": coisas que o agente NUNCA pode fazer, mesmo sob pressão do usuário |

### 4.3 Seções recomendadas (SHOULD)

- **Checklists** com `- [ ]` para cada item verificável — leitura automática vira gate; agentes que falam "verifique X" sem checklist tendem a pular.
- **Tabelas de modo de operação** quando o agente serve a múltiplos cenários (ex: criar / revisar / migrar).
- **Tabelas de classificação de output** (ex: "regular / tolerável / irregular") quando o agente é verificador.

### 4.4 Skill / interface de invocação (MUST)

Além do protocolo em `agents/<nome>.md`, todo agente tem uma skill em `.claude/skills/<nome>/SKILL.md`:

```yaml
---
description: "<descrição idêntica à do protocolo>"
when_to_use: "<gatilho semântico para a LLM escolher esta skill>"
---

Leia e siga o protocolo completo em <path-do-protocolo>.
```

A skill é o ponto de invocação; o protocolo é o conteúdo. Separar permite reuso (ex: protocolo é citado por outros documentos sem precisar virar skill global).

---

## 5. Estrutura de pastas

```
<docs-root>/project-architecture/      # docs canônicos
├── agents/
│   ├── <agent-1>.md                   # protocolo do agente
│   ├── <agent-2>.md
│   └── _index ou redirect             # (opcional, se a lista crescer)
├── design-architecture/               # partners agnósticos
│   ├── agent.md                       # este doc (ou link para o playbook)
│   ├── feedback-loop.md
│   └── ...

.claude/skills/                        # skills do Claude Code (ou equivalente)
├── <agent-1>/SKILL.md
├── <agent-2>/SKILL.md
└── ...

<backlog-root>/                        # ver feedback-loop §5
├── _template.md
├── <agent-1>/
└── ...

<drafts-root>/                         # rascunhos de novos agentes
└── YYYY-MM-DD-<nome>.md
```

A separação **protocolo / skill** é deliberada: o protocolo é o que o agente faz; a skill é como ele é descoberto.

---

## 6. O trio canônico

Todo projeto que adota agentes deve ter, no mínimo, três:

| Agente | Papel | Origem |
|---|---|---|
| Agente(s) de domínio | Executa trabalho específico (criar power, revisar módulo, …) | Padrão observado → draft → aprovação |
| **Processador de feedback** (`docs-review` ou equivalente) | Lê backlog, aplica melhorias, detecta padrões | [`feedback-loop.md §8`](./feedback-loop.md) |
| **Materializador de novos agentes** (`new-agent` ou equivalente) | Transforma draft aprovado em protocolo + skill + entrada no índice | §7 abaixo |

Sem o processador, feedbacks acumulam sem virar melhoria. Sem o materializador, drafts ficam órfãos. Os três se sustentam mutuamente.

---

## 7. Ciclo de vida de um agente

```
1. Padrão observado em execuções
   ↓ (processador detecta via 3-sinais em §3)
2. Rascunho em <drafts-root>/YYYY-MM-DD-<nome>.md (status: draft)
   ↓ (usuário revisa)
3. Aprovação (status: approved)
   ↓ (invocação do materializador)
4. Materialização:
   - agents/<nome>.md (protocolo)
   - .claude/skills/<nome>/SKILL.md (skill)
   - <docs-root>/_index.md (entrada no índice)
   - rascunho atualizado para status: implemented
   ↓
5. Agente em uso → gera feedback → loop fechado
```

**O materializador é gate.** Não criar protocolo + skill manualmente fora dele — pula validações (escopo duplicado, formato do protocolo, atualização do índice).

### 7.1 Estado do rascunho

| Status | Significado |
|---|---|
| `draft` | Recém-criado pelo processador; aguarda revisão humana |
| `approved` | Usuário aprovou; materializador pode prosseguir |
| `discarded` | Usuário decidiu não criar; rascunho preservado como histórico |
| `implemented` | Materializador rodou; campos `agent-file` e `skill-file` apontam para artefatos |

**Rascunhos não se deletam** — viram registro de decisão.

---

## 8. Regras invariantes (todos os agentes)

- **§0 é a primeira ação.** Antes de pré-flight, antes de qualquer pergunta ao usuário, abrir arquivo de feedback.
- **Status do feedback é imutável pelo agente.** Só o processador muda.
- **Encerramento sempre oferece o processador.** Mesmo em execução tranquila.
- **Agente não cria outro agente diretamente.** Sempre via draft + materializador.
- **Agente nunca edita um doc de arquitetura sem ler antes.** Mesmo "pequena correção" passa pelo Read.
- **Agente não muda o índice geral fora do materializador.** Caso à parte: docs de arquitetura novos podem ser indexados na própria sessão.

---

## 9. Anti-padrões

| Anti-padrão | Por quê |
|---|---|
| Criar agente sem 2+ sessões evidenciando padrão | Catálogo incha com agentes que ninguém usa |
| Agente que pula §0 "porque é execução rápida" | Quebra a homogeneidade; perde sinal |
| Agente que muda o próprio `status: pending-review` | Ver [`feedback-loop.md §11`](./feedback-loop.md) |
| Protocolo que duplica conteúdo do doc de arquitetura | Doc de arquitetura é o "o que é correto"; protocolo é o "como executar". Duplicar quebra fonte canônica |
| Agente que cria outro agente direto | Pula `_drafts/ → new-agent`; perde gate humano |
| Skill com `description` vaga ("ajuda com X") | LLM não consegue distinguir de skills próximas; agente vira invisível ou ruidoso |
| Encerramento sem oferta de processador | Backlog não drena; feedback morre na sessão |
| Protocolo sem checklist em fase verificável | "Verifique X" sem `- [ ]` é pulado; checklist explícito é mais robusto |
| Materializador rodando sem `status: approved` | Pula gate; aprovação humana é constitutiva |

---

## 10. Composição com outros patterns

| Pattern | Como compõe |
|---|---|
| [`feedback-loop.md`](./feedback-loop.md) | Base obrigatória — todo agente é produtor; §0 e encerramento são consumo direto |
| [`code-design.md`](./code-design.md) | Agentes verificadores de design usam a §11 (checklist) e §12 (feedback) — exemplo de produtor não-agente que adota o loop |
| [`worktree.md`](./worktree.md) | Agentes que disparam implementação podem operar em worktree — quando aplicável |
| [`subagent-dispatch.md`](./subagent-dispatch.md) | Agentes que despacham subagentes adotam a política de modelos e workflow per-task |

---

## 11. Checklist de verificação

### Existência do trio canônico

- [ ] Existe processador de feedback (`docs-review` ou equivalente) (MUST)
- [ ] Existe materializador de novos agentes (`new-agent` ou equivalente) (MUST)
- [ ] Existem agentes de domínio cobrindo os trabalhos recorrentes do projeto (SHOULD)

### Estrutura de cada agente

- [ ] Tem protocolo em `agents/<nome>.md` (MUST)
- [ ] Tem skill em `.claude/skills/<nome>/SKILL.md` (MUST)
- [ ] Está listado no índice de docs de arquitetura (MUST)
- [ ] `description` da skill é específica e desambigua de skills próximas (MUST)

### Conformidade do protocolo

- [ ] Frontmatter com `description`, `agent`, `argument-hint` (MUST)
- [ ] §0 abre arquivo de feedback como primeira ação (MUST)
- [ ] Pré-flight separa modos de operação quando aplicável (SHOULD)
- [ ] Checklists usam `- [ ]` em fases verificáveis (SHOULD)
- [ ] Registro contínuo de fricções está documentado no protocolo (MUST)
- [ ] Encerramento oferece invocar o processador (MUST)
- [ ] Regras invariantes listadas explicitamente (SHOULD)

### Ciclo de criação

- [ ] Todo agente atual tem rascunho histórico em `<drafts-root>/` com `status: implemented` (SHOULD)
- [ ] Materializador exige `status: approved` antes de prosseguir (MUST)

### Anti-padrões ausentes

- [ ] **NÃO** existe agente sem skill
- [ ] **NÃO** existe agente que muda o próprio status de feedback
- [ ] **NÃO** existe agente criado fora do materializador

---

## 12. Inspirações e evolução

Padrão extraído da prática de projetos reais (agentes de domínio como `power`, `module` e `session-review`, mais os agnósticos `docs-review` e `new-agent`). Para evoluir:

- Novo papel canônico descoberto (além do trio §6) → §6.
- Nova seção do protocolo provada útil em 2+ agentes → §4.2.
- Novo anti-padrão observado → §9.

Mudanças aplicadas via PR + revisão. Sem mudança silenciosa.
