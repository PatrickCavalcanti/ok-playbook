# Feedback Loop Partners

> **Padrão de processo, project-agnostic.** Define como uma execução recorrente (agente, verificador, runner) registra fricção em tempo real para evoluir os documentos e as regras que a guiaram. Foco no *ciclo fechado*: produtor → registro → processador → atualização das fontes.
>
> **Quando este documento entrar em conflito com a prática, a prática vence — atualize o documento.**

---

## 1. Propósito

Toda execução guiada por documentação (um agente que cria powers, um verificador de design, um runner de migração) tem fricções: regra ambígua, exemplo faltando, padrão documentado que não funcionou, correção que o usuário precisou aplicar. Sem captura, essa fricção evapora — a próxima execução repete o mesmo tropeço.

O feedback loop fecha o ciclo: o produtor anota fricção *no momento em que ocorre*, e um processador separado lê o backlog, aplica as melhorias nos documentos canônicos, e detecta padrões que justificam novas regras, novos exemplos, ou novos produtores.

Este doc serve a três usos:

1. **Direcionar** quem está prototipando um agente, verificador ou runner — saber qual loop incorporar.
2. **Verificar** se um produtor existente segue o padrão — checklist auto-aplicável.
3. **Adaptar** o loop para um projeto novo — qual a estrutura mínima de pastas, template e processador.

---

## 2. Como usar este doc

**Modo criação.** Antes de escrever um agente, verificador ou runner recorrente, leia §3 a §6. Decisão arquitetural mínima: onde fica o backlog (§5), qual é o template (§4), e quem é o processador (§8).

**Modo verificação.** Rode o checklist do §12 contra um produtor existente. Se algum item falha, registre a falha no próprio loop — é meta-feedback legítimo.

---

## 3. Conceitos

| Papel | Responsabilidade |
|---|---|
| **Produtor** | Quem executa a tarefa guiada por documentação. Registra fricção em tempo real. Nunca muda status do próprio feedback. |
| **Backlog** | Pasta com um arquivo por execução. Padrão de naming determinístico (`YYYY-MM-DD_HHmm.md`). Frontmatter com `status`. |
| **Processador** | Agente separado que lê o backlog, aplica melhorias nos docs canônicos, marca como `reviewed`, e detecta padrões. |
| **Drafts** | Rascunhos de novos produtores (ou novas regras) que o processador cria a partir de padrões recorrentes — aguardam aprovação humana. |
| **Insights** | Registros de lacunas arquiteturais — coisas que o processador *não* pode resolver sozinho e merecem decisão maior. |

**Regra mestra**: produtor escreve, processador lê e age. Nunca a mesma execução faz os dois — separação previne que o produtor "esqueça" fricções inconvenientes ou se autoabsolva.

---

## 4. Anatomia do registro de feedback

Cada execução que tiver feedback abre **um arquivo único** no backlog — criado no momento do primeiro item registrado, não no boot da sessão (gatilho **lazy**). Estrutura mínima:

### 4.1 Frontmatter (MUST)

```yaml
---
producer: <nome-do-produtor>      # 'power', 'code-design', 'migration-runner-X'
date: YYYY-MM-DD
status: pending-review            # → 'reviewed' (só o processador muda)
reviewed_at: null
---
```

### 4.2 Seções do corpo (MUST)

```markdown
## O que foi feito
[Resumo curto da execução. Preenchido ao final.]

## Dificuldades e fricções
_Registro contínuo — escrito durante a execução, não no final._
- [HH:MM] <descrição do problema e como foi resolvido (se foi)>

## Correções do usuário
_Cada vez que o usuário corrigiu o rumo do produtor._
- <o que foi corrigido e o motivo>

## Sugestões para docs
_O que o produtor acredita que deveria ser atualizado ou adicionado._
- `<doc>.md §<seção>`: <descrição>
```

Seções podem crescer (ex: "Bugs descobertos no caminho", "SQL classificado"), mas as quatro acima são o piso. Template canônico vive em [`../templates/feedback.md`](../templates/feedback.md).

### 4.3 Convenção de timestamp inline (SHOULD)

Cada entrada em "Dificuldades" e "Correções" começa com `[HH:MM]`. Habilita correlação com logs e dá pista de em que momento da execução a fricção surgiu (cedo = ambiguidade de pré-flight; tarde = lacuna no caminho menos comum).

---

## 5. Estrutura de pastas (agnóstica)

```
<backlog-root>/                    # ex: docs/agent-feedback/
├── _template.md                   # template canônico (§4)
├── <producer-1>/                  # um subdir por produtor
│   ├── YYYY-MM-DD_HHmm.md         # uma execução por arquivo
│   └── ...
├── <producer-2>/
└── ...

<drafts-root>/                     # ex: docs/_drafts/
├── _template.md
└── YYYY-MM-DD-<nome>.md           # status: draft|approved|discarded|implemented

<insights-root>/                   # ex: docs/insights/
├── _template.md
└── YYYY-MM-DD-<tema>.md
```

Paths são configuráveis; o que importa é a separação por papel:

- **Backlog** é por produtor (subpasta), porque o processador pode querer filtrar por tipo.
- **Drafts** e **insights** são flat, porque são revisados em ordem cronológica.

**`.gitignore` não cobre estes paths.** O backlog é histórico, vai pro repositório.

---

## 6. A regra do registro contínuo

> **Fricção é registrada no momento em que ocorre, não no fim.**

Este é o princípio que faz o loop funcionar. Quatro razões:

1. **Memória do produtor degrada rapidamente.** No fim da execução, o produtor lembra do tropeço maior, não dos três pequenos que custaram 30s cada.
2. **Contexto se perde.** O fix aplicado num tropeço esquece da pergunta original — só fica a resposta. O processador precisa do par.
3. **Correções do usuário desaparecem.** "Ah, isso eu já corrigi" — mas a documentação ainda não foi atualizada. Sem registro, o próximo executor repete.
4. **Distingue fricção real de incômodo passageiro.** Algo que pareceu pequeno na hora pode ter sido pegada da documentação. Anotar imediatamente preserva a percepção crua.

**Operacionalização**: ao registrar fricção, o produtor para a execução por 30s, anota uma linha no arquivo, e continua. Não acumula mentalmente.

**Anti-padrão**: produtor que diz "vou anotar tudo no fim" — invariavelmente esquece metade e racionaliza o resto.

**Gatilho de criação (lazy)**: o arquivo *nasce* no momento do primeiro item registrado. Não criar no §0 da execução, não criar vazio, não criar "pra marcar presença". Quando a primeira fricção ocorrer, o produtor:

1. Cria o arquivo a partir do template canônico (§4.2).
2. Preenche frontmatter (`producer`, `date`, `status: pending-review`, `reviewed_at: null`).
3. Registra a primeira linha de fricção em "Dificuldades e fricções".
4. Continua a execução. Itens subsequentes anexam ao mesmo arquivo.

Execução sem fricção real **não gera arquivo**. A homogeneidade do sinal vem do gatilho ("toda fricção é registrada"), não da existência forçada do arquivo.

---

## 7. Imutabilidade do status pelo produtor

> **Só o processador muda `status: pending-review` → `reviewed`. O produtor *nunca* toca.**

Razões:

- Garante que toda execução fica pendente até o processador efetivamente ter aplicado as melhorias.
- Previne que o produtor "feche" feedback que não foi efetivamente processado (auto-absolvição).
- Cria fila visível: `grep status: pending-review` lista o backlog real.

O produtor cria o arquivo com `pending-review`, preenche, e *para*. O processador (§8) é quem fecha.

---

## 8. O processador (review agent)

O processador é um agente separado — padrão canônico: `docs-review`. Suas responsabilidades:

### 8.1 Levantar pendentes

Lista arquivos do backlog cujo frontmatter tem `status: pending-review`. Cria uma lista de trabalho visível (TodoWrite ou equivalente) antes de começar.

### 8.2 Confirmar modo

Antes de aplicar mudança alguma, perguntar ao usuário:

> "Encontrei X feedback(s) para processar. Você quer aprovar todos automaticamente, ou prefere validar um a um?"

Em modo *um a um*, nunca aplica mudança sem OK explícito do usuário.

### 8.3 Aplicar melhorias

Para cada item em "Dificuldades", "Correções" e "Sugestões para docs":

1. Identificar o documento afetado.
2. Classificar: ambiguidade (clarificar), informação faltando (adicionar), padrão que não funciona (corrigir/ressalvar), correção do usuário (corrigir o doc).
3. Ler o documento antes de editar.
4. Aplicar a melhoria *mais enxuta* que resolve.

### 8.4 Marcar como reviewed

Após processar um arquivo:

```yaml
status: reviewed
reviewed_at: YYYY-MM-DD
```

Acrescentar ao final do arquivo:

```markdown
## Processado pelo <processador>
- [YYYY-MM-DD] Atualizado `<doc>.md §<seção>`: <descrição>
```

### 8.5 Escopo do processador

| Atualiza | Não atualiza |
|---|---|
| Documentos de arquitetura/regras canônicos | Código de qualquer pacote |
| Protocolos de agentes (se o feedback aponta defeito no protocolo) | Specs/planos de implementação (são artefatos de feature, não regras) |
| Catálogos/checklists (anti-patterns, recipes) | Documentação legada explícita |

**Registra mas não implementa**: mudanças que exigem decisão arquitetural maior. Vão pra `<insights-root>/` para revisão humana.

---

## 9. Detecção de padrões → drafts e insights

Após processar todos os pendentes, o processador faz uma varredura cruzada:

### 9.1 Padrão para novo produtor

Quando os três sinais estão presentes:

1. Mesma **categoria de tarefa** apareceu em 2+ feedbacks de sessões diferentes.
2. A tarefa exigiu **orientação do usuário** para começar (aparece em "Correções").
3. **Nenhum produtor existente** cobre o trabalho.

Criar `<drafts-root>/YYYY-MM-DD-<nome>.md` com:

- Justificativa referenciando os feedbacks que motivaram.
- Escopo proposto (o que faz, o que não faz).
- Rascunho do protocolo.
- Rascunho da skill/interface de invocação.

**Não criar o produtor diretamente** — só o rascunho. Aprovação humana é gate obrigatório.

### 9.2 Padrão para insight

Quando a dificuldade recorrente *não* se resolve criando produtor — é lacuna arquitetural, decisão pendente, ou ambiguidade que exige usuário decidir: criar `<insights-root>/YYYY-MM-DD-<tema>.md`.

Insights são fila de discussão, não fila de implementação.

---

## 10. Encerramento e oferta de processamento

Todo produtor termina sua execução com a mesma oferta:

> "O trabalho está concluído. Há X feedback(s) pendente(s) (incluindo o desta sessão). Quer que eu invoque o `<processador>` para processá-los?"

Contagem inclui feedbacks de sessões *anteriores* ainda pendentes — o processador é a oportunidade natural de drenar o backlog.

**Sobre execuções limpas (sem arquivo criado)**: a oferta de processar continua existindo — sempre pode haver pendentes de sessões anteriores. Quando não há arquivo nesta execução, citar apenas a contagem de pendentes anteriores. Quando há arquivo desta execução, somá-lo à contagem.

---

## 11. Anti-padrões

| Anti-padrão | Por quê |
|---|---|
| Logar fricção só no final da execução | Memória degrada; perde correções pequenas e contexto |
| Produtor mudando o próprio `status: pending-review` | Quebra a separação produtor/processador; permite auto-absolvição |
| Processador editando código (não só docs) | Mistura papéis; gera mudanças sem PR review próprio |
| Adiar criação do arquivo após primeira fricção ("vou criar no fim") | Perde a janela de captura crua; vira anotação tardia |
| Criar arquivo sem fricção real só pra "marcar presença" | Polui o backlog; o processador perde sinal entre execuções "vazias" e execuções com 1 item |
| Criar produtor novo direto, sem passar por draft + aprovação | Pula o gate humano; acumula produtores redundantes |
| Backlog flat (sem subdir por produtor) | Dificulta filtragem; em escala vira ruído |
| Frontmatter sem `status` | Quebra a fila — não dá pra distinguir pendente de processado |
| Processador aplicando mudança não suportada por item de feedback | Sai do escopo; vira preferência pessoal disfarçada de "review" |
| Produtor escrevendo "vou registrar isto depois" no chat | Depois nunca vem; anote ou esqueça |

---

## 12. Checklist de verificação

Para auditar um projeto que diz adotar o feedback loop:

### Estrutura

- [ ] Existe `<backlog-root>/` com subpasta por produtor (MUST)
- [ ] Existe `<backlog-root>/_template.md` (MUST)
- [ ] Existem `<drafts-root>/` e `<insights-root>/` com seus templates (SHOULD)

### Template

- [ ] Frontmatter inclui `producer`, `date`, `status`, `reviewed_at` (MUST)
- [ ] Corpo inclui as 4 seções canônicas (MUST)
- [ ] Convenção `[HH:MM]` documentada para entradas contínuas (SHOULD)

### Produtores

- [ ] Cada produtor cria arquivo **no momento do primeiro feedback registrado**, não antes (MUST)
- [ ] Cada produtor registra fricção em tempo real, não no fim (MUST)
- [ ] Cada produtor termina oferecendo invocar o processador (SHOULD)
- [ ] Nenhum produtor edita o próprio `status` (MUST)

### Processador

- [ ] Existe processador único e identificado (`docs-review` ou equivalente) (MUST)
- [ ] Processador lê pelo frontmatter, não por grep no corpo (SHOULD)
- [ ] Processador pergunta modo (auto / um-a-um) antes de aplicar (SHOULD)
- [ ] Processador marca `reviewed` e registra o que mudou (MUST)
- [ ] Processador detecta padrões → cria drafts/insights (SHOULD)

### Anti-padrões ausentes

- [ ] **NÃO** existe produtor que altera o próprio status
- [ ] **NÃO** existe fricção sem arquivo de feedback correspondente (ausência de arquivo = ausência de fricção; lazy)
- [ ] **NÃO** existe processador que edita código

---

## 13. Inspirações e evolução

Este loop é vivo. Adapta-se ao projeto: o que é "produtor" e "processador" muda; a separação papel ↔ artefato não.

Para evoluir:

- Novo tipo de produtor identificado em uso real → §3 (lista de papéis).
- Nova seção de template descoberta como útil em 2+ produtores → §4.2.
- Novo anti-padrão observado → §11.
- Novo sinal de "padrão para draft" descoberto → §9.1.

Mudanças aplicadas via PR + revisão. Sem mudança silenciosa.

### Composição com outros patterns

- [`agent.md`](./agent.md) consome este loop como base. Todo agente é um produtor.
- [`code-design.md`](./code-design.md) §12 mostra outro produtor (verificador de design) usando o mesmo loop.
- O loop *não* é exclusivo de agentes — qualquer execução repetitiva pode incorporar.

### Categorias de feedback conhecidas

Subpastas canônicas em `<backlog-root>/` por tipo de produtor:

| Categoria | Producer típico | O que registra |
|---|---|---|
| `session/` | a própria sessão (CLAUDE.md gatilho) | Fricções gerais em docs, padrões, regras de processo |
| `<agente-de-dominio>/` | agente específico do projeto (ex: `power/`, `module/`) | Fricções na execução desse agente |
| `permissions/` | `permissions-review` (agente do playbook) | Prompts de permissão repetidos que viraram allowlist + sugestões pra `permissions.md` ou pro snippet |

Cada projeto adiciona categorias conforme seus produtores. A regra invariante é a mesma: um arquivo por execução, frontmatter com `status`, lazy.
