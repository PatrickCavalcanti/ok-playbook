---
date: 2026-05-29
status: open
type: feature
priority: medium
related: ["2026-05-29-ok-playbook-install-monorepo-e-worktree-strategy"]
---

# Harvest de feedback-pro-playbook (lado inbound) pós-migração node_modules

> Insight de nível **playbook** (não deste projeto). Surgiu aqui ao concluir a migração do ok-playbook pra v0.2.0 (vendored → node_modules). Avaliar e materializar diretamente no pacote do playbook.

## O que é

Com a migração do modelo vendored (submódulo em `packages/ok-playbook/`) pro modelo consumível (`node_modules/ok-playbook/`), o caminho de contribuição upstream mudou de natureza, mas o canon ainda assume submódulo.

**O que já existe e cobre o lado "produzir" o feedback-pro-playbook:**
- `feedback-loop.md §8.6` — `docs-review` detecta "Sugestão para docs" que aponta pro playbook, **não edita o canon local** (read-only), roteia pro `playbook-contribute` e mantém `pending-review` até a contribuição existir.
- `playbook-contribute` modo `request` — gera artefato em `<insights-root>/upstream-proposals/` (template `upstream-proposal.md` já existe).

**O que NÃO existe (o gap real):** o lado **inbound / harvest**. O artefato de proposta fica parado no repo consumidor e não há mecanismo pra o mantenedor do playbook **colher** essas propostas de N projetos consumidores e levá-las pro canon.

## Por que importa

- A migração pra node_modules **quebrou os modos `direct` e `branch-pr`** do `playbook-contribute`: ambos fazem `cd packages/ok-playbook && git commit && git push`, mas `node_modules/ok-playbook` é symlink read-only pra store do pnpm, sem `.git`. Só o modo `request` sobrevive — e ele é "pra consumidor sem git access", que não é o caso do mantenedor.
- Sem o lado harvest, propostas upstream acumulam em cada consumidor e **evaporam** (mesmo risco que §8.6 alerta pra feedback que sobrevive 2+ sessões).
- O próprio `playbook-contribute` e o `playbook-audit` têm refs a `git submodule update` que ficaram obsoletas — precisam ser reescritos pro modelo node_modules.

## O que avaliar (decisões pendentes — resolver no pacote do playbook)

- [ ] **Semântica do harvest:** quando uma sessão tem acesso aos dois repos (consumidor + clone do playbook), o harvest **(a)** só deposita as propostas cruas num inbox do playbook pra triar depois, **(b)** aplica a mudança direto nos arquivos do playbook (diff + aprovação) na mesma sessão, ou **(c)** ambos como modos selecionáveis?
- [ ] **Onde mora o feedback-pro-playbook no consumidor:** categoria/subpasta dedicada em `<backlog-root>/` (ex: `playbook/`), os `upstream-proposals/` atuais, ou insight com `type` específico? Precisa ser reconhecível pra sessão de harvest filtrar.
- [ ] **Onde fica o inbox no clone do playbook:** pasta tipo `incoming-proposals/` que o mantenedor processa.
- [ ] **Quem executa:** estender `docs-review`/`playbook-contribute` (que já têm o roteamento §8.6), ou criar um produtor/agente novo de harvest? Como ele descobre o path do clone do playbook (config? argumento?).
- [ ] **Reescrever `playbook-contribute` e `playbook-audit`** pro modelo node_modules (remover suposição de submódulo gravável; trocar `git submodule update` por `pnpm up` + repin de tag).
- [ ] **Rastro/idempotência:** como marcar uma proposta como "colhida" no consumidor pra não recolher; como o consumidor sabe que foi aplicada (rodar `playbook-audit` após bump).

## Referências

- Sessão onde surgiu: conclusão da migração ok-playbook v0.2.0 (2026-05-29).
- Canon relacionado: `node_modules/ok-playbook/patterns/feedback-loop.md §8.6` e §9.2; `node_modules/ok-playbook/agents/playbook-contribute.md`; `node_modules/ok-playbook/agents/playbook-audit.md`; `node_modules/ok-playbook/templates/upstream-proposal.md`.
- Bug correlato (mesma classe): template `_index.template.md` do v0.2.0 emite paths `packages/ok-playbook/` em vez de `node_modules/ok-playbook/` (corrigido localmente no commit que ajusta refs em `docs/architecture/`).
