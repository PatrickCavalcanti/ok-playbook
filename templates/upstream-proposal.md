---
date: YYYY-MM-DD
mode: direct | branch-pr | request
status: drafted | submitted | sent | accepted | rejected | merged | applied
source_insight: <path>            # ex: docs/insights/2026-05-25-permissions-mklink.md
target_paths:                     # arquivos do playbook que esta proposta toca
  - packages/ok-playbook/<path>
pr_url: null                      # preencher em branch-pr depois de abrir o PR
applied_sha: null                 # preencher em direct após push; em branch-pr/request após adoção
consumer_project: <nome>          # nome do projeto que originou a proposta (importante p/ branch-pr e request)
---

# [Título da proposta]

## Resumo

[1-3 linhas: o que muda no playbook e o efeito esperado.]

## Motivação

[Por que a mudança vale ser canon — não só útil pra este projeto. Referência ao insight de origem deve ficar clara.]

### Insight de origem (embutido)

> Este bloco é **obrigatório em `mode: branch-pr` e `mode: request`** — o mantenedor do playbook não tem acesso ao repo consumidor.

```
[Conteúdo completo do arquivo source_insight, copy-paste, sem links externos.]
```

## Mudanças propostas

Para cada arquivo afetado:

### `packages/ok-playbook/<path-1>`

**Tipo de mudança:** [criação | edição | exclusão]

```diff
[diff completo — antes/depois ou patch unified]
```

### `packages/ok-playbook/<path-2>`

[...]

## Steps de aplicação (modo `request`)

> Seção obrigatória **em `mode: request`** — o mantenedor vai aplicar manualmente.

1. `cd <playbook-repo>`
2. Editar `<path-1>` substituindo `<bloco-antigo>` por `<bloco-novo>` (ou aplicar o diff acima).
3. [demais steps]
4. `git add <paths>`
5. `git commit -m "<tipo>: <descrição curta>"`
6. `git push origin main`

## Como validar

[Como o mantenedor (ou o consumidor após adoção) verifica que a mudança não quebrou outros consumidores. Pode ser "rodar `playbook-audit` em projeto X após bump", "checar que template Y ainda renderiza", etc.]

## Como o consumidor adota após upstream merge

1. `git submodule update --remote packages/ok-playbook`
2. Pedir "revalida o ok-playbook" → `playbook-audit` mostra o canon novo e oferece adotar.
3. Atualizar status deste artefato pra `merged` (ou `applied` quando consumidor confirmar adoção).

## Notas de status

- `drafted` — artefato criado pelo `playbook-contribute`; ainda não enviado/submetido.
- `submitted` (apenas `branch-pr`) — PR aberto; aguardando review.
- `sent` (apenas `request`) — artefato enviado ao mantenedor pelo canal combinado.
- `accepted` / `rejected` — mantenedor respondeu mas ainda não mergeou (ou recusou).
- `merged` — mudança incorporada ao playbook canônico.
- `applied` — consumidor já rodou `playbook-audit` pós-merge e adotou no projeto.

Updates de status são edições manuais subsequentes deste arquivo — não automatizadas.
