---
suggested-by: docs-review
date: YYYY-MM-DD
status: draft
source-feedbacks:
  - <backlog-root>/<agente>/YYYY-MM-DD_HHmm.md
  - <backlog-root>/<agente>/YYYY-MM-DD_HHmm.md
---

# Agente Proposto: [Nome]

## Justificativa

[Por que este padrão merece um agente próprio. Descrever as sessões onde o padrão apareceu e o que tornava o trabalho repetitivo ou difícil sem orientação.]

## Escopo

**Faz:**
- [o que o agente cobre]

**Não faz (fora do escopo):**
- [o que explicitamente não é responsabilidade deste agente]

**Não duplica:**
- [qual agente existente poderia parecer similar e por que este é diferente]

## Protocolo proposto

[Rascunho do protocolo do agente — seções, checklists, regras invariantes.]

---

## SKILL.md proposto

```yaml
---
description: "[Uma linha descrevendo o que o agente faz]"
when_to_use: "[Frases ou contextos que disparam a invocação automática]"
---

Leia e siga o protocolo completo em `<agents-root>/<nome>.md`.
```

---

_Para aprovar: altere `status: draft` para `status: approved` e invoque a skill `new-agent`._
_Para descartar: altere `status: draft` para `status: discarded` com um comentário de motivo._
