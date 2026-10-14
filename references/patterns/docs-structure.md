# Docs Structure

> **Padrão de organização da documentação do projeto, project-agnostic.** Define a hierarquia de pastas onde vivem (1) a documentação de arquitetura, (2) o ciclo de vida de specs e planos, e (3) os artefatos do ciclo de feedback. Foco no *contrato estrutural* — não em conteúdo de domínio.
>
> **Quando este documento entrar em conflito com a prática, a prática vence — atualize o documento.**

---

## 1. Propósito

Um projeto que adota o `ok-playbook` precisa de um lugar previsível pra:

1. **Documentar a arquitetura** — visão geral, dimensões (módulos, powers, frontend, etc.), agentes domain, partners filosóficos.
2. **Materializar specs e planos** — ciclo de vida de feature: rascunho → spec → plano → execução → arquivo.
3. **Operar o feedback loop** — backlog (`<backlog-root>`), rascunhos de agentes (`<drafts-root>`), insights (`<insights-root>`).

Sem uma estrutura combinada, cada projeto reinventa onde botar o quê — e Claude Code (ou outros LLMs) gastam contexto descobrindo o layout em vez de operar nele.

Este doc serve a três usos:

1. **Direcionar** quem está instalando o playbook num projeto novo — entender qual pasta criar onde.
2. **Verificar** se um projeto existente segue o padrão — checklist auto-aplicável.
3. **Adaptar** o padrão para um projeto que já tem layout diferente — onde estão os pontos flexíveis.

---

## 2. Como usar este doc

**Modo configuração nova.** Antes de criar a estrutura, leia §3 (layout canônico) e §4 (placeholders). A skill `ok-playbook` cria o scaffolding de §3 a partir desta convenção.

**Modo verificação.** Rode o checklist do §9 contra um projeto existente.

**Modo migração.** Se o projeto consumidor já tem docs estruturadas em outro layout, §8 cobre como mapear sem refactor disruptivo.

---

## 3. Layout canônico

```
<consumer-project>/
├── CLAUDE.md                              # entrypoint do Claude Code
├── ok-playbook.json                       # manifesto da skill (caminhos + estado de cada item)
│
└── docs/                                  # chave `paths.docs` (default `docs/`)
    │                                      # pai de todas as outras pastas de docs
    │
    ├── project-architecture/              # `paths.arch` — onde vive a arquitetura
    │   ├── _index.md                      # ⭐ MAPA central — entrypoint da arq
    │   ├── project.md                     # visão geral
    │   ├── <dimensão-1>.md                # ex: modules.md, powers.md, frontend.md
    │   ├── <dimensão-N>.md
    │   ├── agents/                        # `paths.agents` — agentes de domínio
    │   │   └── <nome>.md
    │   └── design-architecture/           # (opcional) partners — extensões
    │                                      #     filosóficas dos patterns canon
    │
    ├── superpowers/                       # `paths.superpowers` — ciclo de vida
    │   ├── drafts/                        # rascunhos de feature
    │   ├── specs/                         # specs ativas
    │   │   └── done/                      # specs arquivadas
    │   └── plans/                         # planos ativos
    │       └── done/                      # planos arquivados
    │
    ├── agent-feedback/                    # `paths.backlog` — feedback de agentes
    │   ├── _template.md
    │   └── <agente>/YYYY-MM-DD_HHmm.md
    │
    ├── _drafts/                           # `paths.drafts` — rascunhos de agentes
    │   ├── _template.md
    │   └── YYYY-MM-DD-<nome>.md
    │
    ├── pendencias/                        # `paths.pendencias` — o que precisa
    │   ├── _template.md                   #   ser feito e não impediu a entrega
    │   └── YYYY-MM-DD-<plano-ou-sessão>.md  # (ver patterns/dev-process.md §9)
    │
    ├── insights/                          # `paths.insights` — insights & upstream
    │   ├── _template.md
    │   ├── YYYY-MM-DD-<tema>.md
    │   └── upstream-proposals/            # propostas ao playbook (issue/PR/commit)
    │
    └── ok-playbook/                       # cópia local do playbook (patterns, templates, protocolos)
```

(A árvore mostra os defaults; cada pasta marcada com `paths.*` é uma chave do manifesto `ok-playbook.json` e pode apontar para outro lugar.)

Princípio chave: **todas as pastas de docs são filhas de `paths.docs`**. Não tem pasta de docs órfã fora dele. Isso simplifica o mental model do consumidor — "tudo que é doc do projeto está sob `paths.docs`".

---

## 4. Placeholders

Os caminhos do projeto vivem no campo `paths` do manifesto `ok-playbook.json`. Cada chave abaixo tem um default e um significado; o canon usa nomes simbólicos nos docs-fonte, e a skill `ok-playbook` os troca pelo caminho real ao materializar — por isso os docs do projeto já mostram caminhos concretos.

| Chave em `paths` | Default | Significado |
|---|---|---|
| `docs` | `docs/` | Pai de todas as outras pastas de docs. Onde vive tudo que é doc |
| `arch` | `docs/project-architecture/` | Raiz da arquitetura. Onde vive `_index.md` |
| `agents` | `docs/project-architecture/agents/` | Agentes de domínio do projeto |
| `superpowers` | `docs/superpowers/` | Ciclo de vida de specs/planos |
| `backlog` | `docs/agent-feedback/` | Feedback de execuções de agentes |
| `drafts` | `docs/_drafts/` | Rascunhos de novos agentes |
| `insights` | `docs/insights/` | Insights de evolução + upstream-proposals |
| `pendencias` | `docs/pendencias/` | Pendências de trabalho (≠ insight): um arquivo por sessão/plano, tabela com área na 1ª coluna ([`dev-process.md §9`](./dev-process.md)) |

A cópia dos patterns e templates dentro do projeto fica em `ok-playbook/` sob a pasta de docs (default `docs/ok-playbook/`); a skill `ok-playbook` a materializa na configuração. **Nunca hardcode o caminho em doc do canon** — escreva sempre o placeholder simbólico; um link com caminho fixo aponta pra nada quando o projeto escolhe outro `paths.docs`, e falha em silêncio: markdown quebrado não emite erro, só deixa o agente sem a doc.

**Defaults são overridáveis.** Projeto pode escolher outros valores em `paths` no `ok-playbook.json` — mas o canon recomenda os defaults para coerência cross-projeto.

---

## 5. O `_index.md` da arquitetura

`<arch-root>/_index.md` é o **mapa central** do projeto. Ele NÃO é "mais um doc" — é o entrypoint que organiza os outros. Por convenção:

### 5.1 Estrutura obrigatória

| Seção | Conteúdo |
|---|---|
| Abertura | 1-2 frases sobre o que é a pasta + regra "código vence quando entra em conflito" |
| **Estrutura da pasta** | Tree ASCII de `<arch-root>/` com 1 linha de comentário por arquivo |
| **Quando ler qual documento** | Tabela `<situação> → <doc a ler>`. Inclui agentes |
| Regras de manutenção | Tabela "Quando atualizar" + "Quem atualiza" + "O que nunca fazer" |
| Fluxo de feedback e manutenção | Diagrama ASCII de produtor → backlog → processador → docs |
| Estrutura em `<docs-root>/` relacionada | Tree ASCII das outras pastas de docs (backlog, drafts, insights, superpowers) |

### 5.2 Estrutura recomendada (SHOULD)

- Seção "Ciclo de vida de specs e planos" se o projeto consome o `<superpowers-root>/`.
- Link para `ok-playbook.json` e para o `<arch-root>/design-architecture/` (se houver partners).

### 5.3 Template

Esqueleto canônico em [`<playbook-root>templates/_index.template.md`](<playbook-root>templates/_index.template.md). Copiar e adaptar ao domínio do projeto consumidor.

---

## 6. Ciclo de vida de specs e planos

`<superpowers-root>/` opera com o ciclo de superpowers (`brainstorming` → `writing-plans` → `executing-plans` ou `subagent-driven-development`):

```
ideia aprovada em brainstorm, mas sem spec ainda
  → <superpowers-root>/drafts/YYYY-MM-DD-<nome>.md

spec commitada e aprovada
  → <superpowers-root>/specs/YYYY-MM-DD-<nome>-design.md  (active)
  → plano começa

execução do plano concluída
  → mover spec para <superpowers-root>/specs/done/
  → mover plano para <superpowers-root>/plans/done/
```

### 6.1 Regras invariantes do ciclo

- **Specs não ficam ativas depois que o plano existe** — arquivam pra `done/` no momento que o plano é commitado.
- **Planos não ficam ativos depois que a execução termina** — arquivam pra `done/` no momento que o implementer finaliza.
- **`drafts/` é livre** — entra e sai sem ritual. Quando vira spec, descartar o draft (ou manter como histórico, decisão do projeto).
- **`<superpowers-root>/` é distinto de `<insights-root>/`** — specs/planos são trabalho que vai virar código; insights são observações que viram melhoria estrutural ou são adiadas.

---

## 7. Composição com outros patterns

| Pattern | Como compõe |
|---|---|
| [`agent.md`](./agent.md) | Define §5 "Estrutura de pastas" — esta convenção implementa `<agents-root>` e `<arch-root>` |
| [`feedback-loop.md`](./feedback-loop.md) | Define `<backlog-root>`, `<drafts-root>`, `<insights-root>` — esta convenção posiciona como sub-pastas de `<docs-root>` |
| [`code-design.md`](./code-design.md) | §9 prescreve `ARCHITECTURE.md` por unidade — template canônico vive em `<playbook-root>templates/ARCHITECTURE.md` |
| [`memory.md`](./memory.md) | Memórias persistentes não vivem em `<docs-root>` — são `~/.claude/projects/.../memory/`. Não confundir |

---

## 8. Migração de projetos com layout pré-existente

Se o projeto consumidor já tem docs estruturadas em outro lugar (ex: `dev-prompts/project-architecture/`, `documentation/`, `wiki/`), duas estratégias:

### 8.1 Migração física

`git mv` do conteúdo pro layout canônico. Trabalho mecânico; ganho: cross-projeto vira coerente.

Custos:
- Refs internas (`../powers.md`, etc.) seguem funcionando — move junto.
- Refs externas (CLAUDE.md, SKILLs, scripts) precisam atualizar.
- Refs históricas (feedbacks antigos, planos arquivados) ficam stale — **deixar como estão** (são registros do passado).

### 8.2 Adapter via placeholders

Manter o path atual e overridar as chaves correspondentes no campo `paths` de `ok-playbook.json`:

```json
{
  "paths": {
    "arch": "dev-prompts/project-architecture/"
  }
}
```

(`arch` aponta para um layout não-canônico de projeto antigo; as chaves não declaradas ficam no default.)

Custos:
- Mental model fica ligeiramente menos coerente (as chaves apontam pra fora de `paths.docs`).
- Novos consumidores do mesmo projeto têm que aprender o mapeamento custom.

**Recomendação:** se o projeto tem < 100 arquivos arq, vale 8.1. Se tem mais ou é compartilhado com terceiros, considerar 8.2.

---

## 9. Checklist de verificação

### Existência

- [ ] `<arch-root>/_index.md` existe (MUST)
- [ ] `<arch-root>/agents/` existe se há agentes domain (MUST se aplicável)
- [ ] `<playbook-root>templates/ARCHITECTURE.md` existe (SHOULD)
- [ ] `<superpowers-root>/{drafts,specs,plans}/` existem (SHOULD se o projeto usa o ciclo)
- [ ] `<backlog-root>/`, `<drafts-root>/`, `<insights-root>/` existem (MUST se há agentes)

### Conformidade do `_index.md`

- [ ] Abertura com regra "código vence" (MUST)
- [ ] Tree ASCII da pasta (MUST)
- [ ] Tabela "Quando ler qual documento" (MUST)
- [ ] Seção "Regras de manutenção" (MUST)
- [ ] Diagrama "Fluxo de feedback e manutenção" (SHOULD)
- [ ] Tree das outras pastas de docs sob a pasta de docs (SHOULD)

### Coerência de placeholders

- [ ] `paths.docs` é pai das outras chaves de `paths` (MUST quando defaults usados)
- [ ] `ok-playbook.json` (campo `paths`) reflete os paths reais (MUST)
- [ ] Refs em `CLAUDE.md`, SKILLs, scripts apontam pros paths atuais (MUST)

### Anti-padrões ausentes

- [ ] **NÃO** existe `_index.md` fora de `<arch-root>`
- [ ] **NÃO** existe agente fora de `<agents-root>` sem nota explicando
- [ ] **NÃO** existe spec ativa depois que o plano correspondente existe (deveria estar em `done/`)
- [ ] **NÃO** existe doc órfão sem ponteiro a partir do `_index.md`

---

## 10. Anti-padrões

| Anti-padrão | Por quê |
|---|---|
| `_index.md` na raiz do projeto (fora de `<arch-root>`) | Confunde escopo — `_index.md` é da arquitetura, não do projeto inteiro |
| Spec ativa sem plano (eternamente em `specs/`, nunca em `done/`) | Spec sem plano = trabalho não decidido; ou plano nasce, ou spec vira insight, ou descarta |
| Plano em `plans/` depois da execução | Acumula confusão sobre "o que está em andamento" |
| `paths.arch` com valor não-default sem `ok-playbook.json` atualizado | Outros agentes não acham o `_index.md` |
| Múltiplos `_index.md` em sub-pastas | Cria ambiguidade — `_index.md` é único, no `<arch-root>/` |
| Mistura specs com docs arq (specs vivendo em `<arch-root>/`) | Specs são histórico de decisão; docs arq são verdade atual — vidas distintas |

---

## 11. Inspirações e evolução

Padrão extraído da prática. Para evoluir:

- Nova seção obrigatória do `_index.md` validada em 2+ projetos → §5.1.
- Nova chave canônica de `paths` (além das 8 em §4) → §4.
- Novo anti-padrão observado → §10.

Mudanças aplicadas via PR + revisão. Sem mudança silenciosa.
