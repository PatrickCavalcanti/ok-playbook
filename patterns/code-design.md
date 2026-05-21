# Code Design Philosophy

> **Pai filosófico e verificador.** Define como estruturar código no projeto, independente do tipo (módulo, power, script, lib interna). Referência conceitual acima dos docs procedurais específicos de cada tipo de unidade.
>
> **Quando este documento entrar em conflito com o código, o código vence — atualize o documento.**

---

## 1. Propósito

Este doc serve a dois usos:

1. **Direcionar** quem cria código novo — referência de princípios antes de escrever.
2. **Verificar** código existente — agente roda este doc contra um trecho e reporta conformidade.

Não substitui docs procedurais de tipos específicos de unidade (`modules.md`, `powers.md`, etc.) — é o pai conceitual deles. Aqueles ficam com o procedimento ("como criar um módulo"); este fica com os princípios ("por que estruturamos assim").

---

## 2. Como usar este doc

**Modo criação.** Leia antes de escrever código novo. Se está criando uma unidade que tem doc procedural próprio (módulo, power, etc.), leia também esse doc depois. Se está modificando, releia a seção relevante para garantir aderência.

**Modo verificação.** Passe um trecho de código + este doc para o agente verificador. Ele aplica o checklist (§11) e reporta conformidade no formato definido. Ao terminar, registra fricções em `<backlog-root>/code-design/` (§12) e oferece invocar o processador de feedback para evoluir as regras.

---

## 3. As 5 camadas canônicas

Toda peça de código pertence a uma das 5 camadas:

| Camada | Responsabilidade | Exemplos |
|---|---|---|
| **Dados** | Schema, persistência, repo, bridge — "como é guardado" | `defineEntity`, CRUD, queries |
| **Domínio** | Regras de negócio, workflows, formatters — "o que significa" | validações, decisões, transformações de domínio |
| **Interface de capacidade** | Tools LLM, slash commands, API pública — "como é invocado externamente" | `functions/`, `commandchat.js`, contrato de `index.js` |
| **Apresentação** | UI, painéis, slots, componentes visuais — "como é mostrado" | componentes React, painéis, slots de shell, CSS Modules |
| **Utilitários puros** | Helpers sem estado, sem I/O — "ferramentas neutras" | parse, format, cálculos |

**Regra mestra**: um arquivo idealmente pertence a **uma camada**. Misturar camadas é o gatilho mais forte para dividir.

---

## 4. Naming pelo domínio (não pela tecnologia)

> **Pastas e arquivos descrevem o que fazem no domínio, não como estão implementados.**

`tarefas/`, não `task-controller/`. `memory/`, não `pgvector-store/`. `google-calendar/`, não `oauth-rest-client/`.

Inspirado em Screaming Architecture: a estrutura do projeto deve gritar o que ele faz, não a stack que usa. **MUST** — agente verificador pode checar binariamente: o nome da pasta/arquivo descreve capacidade ou tecnologia?

**Exceção legítima**: pastas de camada interna (`entities/`, `functions/`, `utils/`) são padrão estrutural compartilhado, não nome de capacidade. Esse vocabulário é fixo e definido aqui — substituí-lo seria pior.

---

## 5. Ponto de contato proporcional

Cada unidade tem ponto(s) de entrada explícito(s). Consumidores externos só entram pela porta. Internos podem se falar direto.

Quando o ponto único acumula responsabilidades divergentes a ponto de dificultar manutenção, ele subdivide em pontos por categoria (ex: `index.js` raiz → `entities/index.js` separado), **desde que o contrato externo permita e faça sentido**.

Subdividir é decisão arquitetural — nem todo lugar comporta. Avalie o contrato externo antes de cortar.

---

## 6. Registry e descoberta

Toda extensão acontece por descoberta automática (registry, side-effect import, convenção de pasta). Código existente nunca é editado para "saber sobre" código novo.

**Anti-pattern duro (MUST):**

````js
// ❌ lista hardcoded de variantes do mesmo tipo
import { powerA, powerB, powerC } from './powers/index.js';
const all = [powerA, powerB, powerC];
````

**Padrão correto:**

````js
// ✅ registry + descoberta — adicionar nova variante = criar pasta
const all = await discoverPowers('./powers/');
````

Quando há ≥2 variantes do mesmo tipo, exige registry.

---

## 7. Isolamento entre unidades

Duas regras complementares que governam como unidades se relacionam.

### 7.1 — Sem import lateral entre unidades do mesmo nível (MUST)

Unidades irmãs (power ↔ power, módulo ↔ módulo) **não importam diretamente uma da outra**. Comunicação acontece por:

- **API pública declarada** (`index.js` da unidade alvo) quando o consumo é arquitetural;
- **Registry compartilhado** quando é descoberta cross-unit.

Inspirado em Feature-Sliced Design ("slices não importam slices"). Garante que cada unidade pode ser removida, substituída ou movida sem cascata. SQL direto em tabela "pertencente" a outra unidade é débito arquitetural — `SHOULD × tolerável` se justificável, `MUST × irregular` em código novo.

### 7.2 — Direção de imports respeita as camadas da plataforma (MUST)

Unidades só importam de **camadas estritamente inferiores** na hierarquia da plataforma.

Detalhe da hierarquia (foundation/platform/capabilities) vive no doc de projeto; aqui ficam só o princípio e a regra. O verificador checa: olhe os imports da unidade — todos vêm de camadas abaixo? Importa de unidade da mesma camada? Importa "para cima"? Sinaliza.

---

## 8. Regra fractal — escada de 3 degraus

Crescimento do código segue 3 degraus. **Comece sempre no degrau 1.** Suba só quando o gatilho do próximo degrau aparecer.

| Degrau | Forma | Gatilho para subir |
|---|---|---|
| **1. Tudo num arquivo** | Um arquivo único cobre a responsabilidade | Aparece **2ª responsabilidade da mesma camada** com contexto claramente diferente |
| **2. Múltiplos arquivos na mesma pasta** | Um arquivo por contexto, irmãos no mesmo nível | Pasta passa de ~5 arquivos OU consumidores externos só querem parte do conjunto |
| **3. Subpasta com `index.js` próprio** | A pasta vira unidade com porta (§5) | — (último degrau no escopo de uma unidade) |

**Gatilho semântico** (mais importante que contagem): múltiplos contextos claramente diferentes no mesmo arquivo.

> Exemplo: `utils.js` cresce e ganha helpers de data, helpers de string e converter de objeto. São contextos separados. Enquanto o conjunto é pequeno, tudo bem ficar junto. Quando cresce, divide um arquivo por contexto (`utils/date.js`, `utils/string.js`, `utils/object.js`).

**Critério prático**: "se eu pedir para alguém abrir este arquivo, ela acha rápido a função que procura, ou tem que rolar entre seções não relacionadas?"

**Referência conceitual**: o mesmo critério vale para componentes React. Um componente cresce → extrai sub-componentes por responsabilidade visual; hooks compartilhados saem para `hooks/`; helpers puros saem para `utils/`. Não é específico de UI — é a mesma escada fractal.

---

## 9. Documentação arquitetural por unidade modular

> **Toda unidade modular (módulo, power, ou qualquer outra unidade que tenha fronteira própria e ciclo de vida independente) deve ter um documento que descreve sua arquitetura interna.** O doc nasce com a unidade e evolui junto com o código — não é entregável posterior.

**Conteúdo mínimo:**

1. **Propósito** — 1-2 frases sobre o que a unidade faz e por que existe.
2. **Decisões arquiteturais** — escolhas relevantes (camadas presentes, padrões adotados, alternativas descartadas e por quê).
3. **Mapa de arquivos** — quais arquivos existem e qual responsabilidade cada um carrega (referência rápida ao degrau fractal atual).
4. **Pontos de contato** — o que a unidade expõe externamente (API pública) e como consumidores devem usar.
5. **Dependências** — de quais outras unidades/camadas depende e por quê.
6. **Decisões em aberto / dívidas** — débitos arquiteturais conhecidos, refactors planejados.

**Localização**: o arquivo vive **junto da unidade**, não em pasta de docs central. Convenção típica: `<path-da-unidade>/ARCHITECTURE.md`.

> **Distinção do `README.md`**: `README.md` é apresentação humana (o que faz, capacidades, como usar). `ARCHITECTURE.md` é decisão de design (por que está estruturado assim, quais regras internas). README é externo; ARCHITECTURE é interno.

**Co-evolução obrigatória**: ao modificar a estrutura interna da unidade (adicionar camada, subdividir ponto de contato, mudar dependência), **atualize o `ARCHITECTURE.md` no mesmo commit**. Doc desatualizado é falha de manutenção, não rotina aceitável. Verificador checa: timestamp do `ARCHITECTURE.md` vs commits recentes que tocaram em estrutura.

> **Quando NÃO se aplica**: arquivos soltos, scripts utilitários, libs externas que são repos separados. Só unidades modulares "de verdade" — com fronteira própria — precisam.

Template base: [`../templates/ARCHITECTURE.md`](../templates/ARCHITECTURE.md).

---

## 10. Anti-patterns (catálogo vivo)

Lista curta no início, expandida pelo processador de feedback ao longo do tempo a partir dos verificadores. Cada anti-pattern tem severidade.

**Sementes iniciais:**

- **MUST** — Lista hardcoded de variantes onde devia haver registry (§6)
- **MUST** — Mistura de camadas no mesmo arquivo sem justificativa (§3)
- **MUST** — Naming por tecnologia em pasta/arquivo de capacidade (§4)
- **MUST** — Import lateral entre unidades irmãs (§7.1)
- **MUST** — Import "para cima" violando direção de camadas (§7.2)
- **MUST** — Unidade modular sem `ARCHITECTURE.md` (§9)
- **SHOULD** — Ponto único de contato com responsabilidades divergentes (não subdividiu quando devia)
- **SHOULD** — Manter degrau 1 quando já tem múltiplos contextos crescidos (§8)
- **SHOULD** — `ARCHITECTURE.md` desatualizado em relação à estrutura atual da unidade
- **CONSIDER** — Arquivo > ~300 linhas sem ter passado por avaliação de degrau

---

## 11. Checklist de verificação

Duas dimensões cruzadas.

### Severidade da regra (intrínseca)

- **MUST** — proibido violar.
- **SHOULD** — violar exige justificativa documentada.
- **CONSIDER** — sintoma, não erro.

### Status da verificação (resultado da análise do código)

- **regular** — atende à regra.
- **tolerável** — viola mas é justificável no contexto; emite aviso de possível melhoria.
- **irregular** — viola sem justificativa; exige fix.

### Combinações e ação esperada

| Regra × Status | Ação |
|---|---|
| MUST × irregular | bloqueio — fix obrigatório |
| MUST × tolerável | revisar justificativa; raramente aceitável |
| SHOULD × irregular | fix recomendado; abrir issue se postergar |
| SHOULD × tolerável | aviso registrado; ok |
| CONSIDER × qualquer | nota informativa |

### Itens do checklist

Estrutura inicial; o processador de feedback evolui com base no uso.

````
### Camada
- [ ] Cada arquivo pertence a uma das 5 camadas canônicas (MUST)
- [ ] Não mistura camadas sem justificativa (MUST)

### Naming
- [ ] Pastas/arquivos de capacidade refletem domínio, não tecnologia (MUST)

### Ponto de contato
- [ ] Há ponto(s) de entrada explícito(s) (MUST)
- [ ] Consumidores externos só importam da porta (MUST)
- [ ] Se o ponto acumulou responsabilidades divergentes, foi subdividido (SHOULD)

### Registry e descoberta
- [ ] Não há lista hardcoded de variantes onde devia haver registry (MUST)

### Isolamento entre unidades
- [ ] Sem import lateral entre unidades irmãs do mesmo nível (MUST)
- [ ] Imports respeitam a direção das camadas da plataforma (MUST)

### Fractal
- [ ] Está no degrau certo (não está no 1 com múltiplos contextos crescidos) (SHOULD)
- [ ] Arquivo grande (>300 linhas) foi avaliado contra degrau 2/3 (CONSIDER)

### Documentação arquitetural
- [ ] Unidade modular tem `ARCHITECTURE.md` junto da unidade (MUST)
- [ ] `ARCHITECTURE.md` reflete a estrutura atual (SHOULD)
````

### Formato de report

````
[STATUS] [REGRA-SEVERIDADE] descrição — arquivo:linha — justificativa (se tolerável)
````

Exemplo:

````
[irregular] [MUST] Camada misturada — packages/foo/src/index.js:45 — função CRUD ao lado de tool LLM
[tolerável] [SHOULD] Ponto de contato concentrado — packages/bar/src/index.js — única entidade, subdivisão prematura
````

---

## 12. Loop de feedback

O agente verificador mantém um arquivo de feedback **em tempo real** durante a execução. Registra fricções: regras vagas, casos não cobertos, anti-patterns novos descobertos, exemplos que ajudariam.

**Localização**: `<backlog-root>/code-design/YYYY-MM-DD_HHmm.md`

**Template**: reusa o template compartilhado em [`../templates/feedback.md`](../templates/feedback.md) (ajustar o campo `producer:` para `code-design`).

Ao terminar a verificação, **oferece invocar o processador de feedback** (`docs-review` ou equivalente) para incorporar o feedback ao próprio doc — evoluindo regras, anti-patterns e exemplos. Mesma mecânica documentada em [`./feedback-loop.md`](./feedback-loop.md).
