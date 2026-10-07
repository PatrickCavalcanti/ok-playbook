# ARCHITECTURE — <nome da unidade>

> Template base para `ARCHITECTURE.md` de módulos e powers. Ver [`../patterns/code-design.md §9`](../patterns/code-design.md) para a regra completa.
>
> Este doc nasce com a unidade e evolui junto com o código. Atualize-o no mesmo commit que mudar a estrutura interna.

## Propósito

<1-2 frases sobre o que esta unidade faz e por que existe. Não repetir o README — aqui é a razão arquitetural.>

## Decisões arquiteturais

- **Camadas presentes**: <quais das 5 camadas canônicas a unidade contém — Dados / Domínio / Interface de capacidade / Apresentação / Utilitários puros>
- **Padrões adotados**: <ex: cache-first com fallback API; entity-as-module; sub-agente via defineShadow; etc.>
- **Alternativas descartadas**: <ex: cogitamos X; rejeitamos porque Y>

## Mapa de arquivos

| Arquivo / pasta | Camada | Responsabilidade |
|---|---|---|
| `src/index.js` | Interface de capacidade | Ponto de contato externo |
| `src/entities/` | Dados | <descrição> |
| ... | ... | ... |

**Degrau fractal atual**: <1 (tudo num arquivo) / 2 (múltiplos arquivos na pasta) / 3 (subpastas com index próprio)>

## Pontos de contato

**Exporta:**

- `<nome>` — <o que é, quando usar>
- ...

**Consumidores típicos:**

- <unidade ou camada que consome>

**Como NÃO usar:** <armadilhas conhecidas; o que não importar diretamente>

## Dependências

| Depende de | Camada | Por quê |
|---|---|---|
| `<lib-foundation>` | foundation | <motivo> |
| ... | ... | ... |

> Importações laterais (unidade irmã na mesma camada) são proibidas — ver §7.1 do doc filosófico. Listar aqui qualquer exceção justificada.

## Decisões em aberto / dívidas

- <débito arquitetural conhecido>
- <refactor planejado>
- <questão pendente>
