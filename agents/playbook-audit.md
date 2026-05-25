---
description: "Revalidar o projeto contra a versão atual do ok-playbook. Detecta drift entre o canon e o que está instalado, item por item, e oferece atualizar, manter ou marcar como customização local."
agent: "agent"
argument-hint: "Deixe em branco para auditar todos os componentes registrados em OKPLAYBOOK.md. Pode passar um componente específico (ex: 'templates', 'git-rules', 'CLAUDE.md')."
---

# Agente — Playbook Audit

Compara o estado atual do projeto consumidor com a versão atual do `ok-playbook` (no SHA do submódulo presente em `packages/ok-playbook/`) e produz um **drift report** item por item. Para cada divergência, o usuário decide: atualizar (puxar do playbook), manter (cópia local prevalece), ou marcar como customização intencional (ignorada em auditorias futuras).

**Referência canônica:** [`../INSTALL.md`](../INSTALL.md) (o que foi instalado) + [`../install/okplaybook-template.md`](../install/okplaybook-template.md) (estrutura do manifesto).

**Gatilho:** **manual apenas.** Usuário pede explicitamente "revalida o ok-playbook" ou "audita drift do playbook". Não roda automaticamente em nenhum hook, nem após `git submodule update --remote`.

---

## Pré-condições

Antes de começar:

- [ ] `packages/ok-playbook/` existe e contém `patterns/`, `agents/`, `templates/`, `install/`.
- [ ] `OKPLAYBOOK.md` existe no root do projeto. Se não existir, abortar e responder: "Não há `OKPLAYBOOK.md` neste projeto. Rode primeiro a instalação (`packages/ok-playbook/INSTALL.md`)."
- [ ] `git` disponível pra inspecionar SHA do submódulo.

---

## Protocolo de execução

### 1. Levantar versões

1. Ler `OKPLAYBOOK.md` — extrair: SHA registrado, componentes ativos, paths customizados, **seção "Customizações locais" (se existir)**.
2. Obter SHA atual do submódulo: `git -C packages/ok-playbook rev-parse HEAD`.
3. Se SHA registrado == SHA atual:
   - Pode haver drift mesmo sem upgrade (alguém editou cópia local). Continuar mas sinalizar no relatório: "Mesmo SHA — drift detectado é edição local, não evolução do playbook."
4. Se SHA registrado != SHA atual:
   - Listar commits entre eles afetando paths relevantes: `git -C packages/ok-playbook log --oneline <sha-antigo>..<sha-novo> -- patterns/ agents/ templates/ install/`.
   - Usar essa lista pra orientar onde olhar com mais atenção.

### 2. Construir lista de itens a auditar

Para cada componente marcado ativo em `OKPLAYBOOK.md`, gerar um item de auditoria:

| Tipo de item | O que comparar | Fonte canônica | Cópia local |
|---|---|---|---|
| Template `feedback` | conteúdo arquivo a arquivo | `packages/ok-playbook/templates/feedback.md` | `<backlog-root>/_template.md` |
| Template `draft` | idem | `packages/ok-playbook/templates/draft.md` | `<drafts-root>/_template.md` |
| Template `insight` | idem | `packages/ok-playbook/templates/insight.md` | `<insights-root>/_template.md` |
| Template `ARCHITECTURE` | idem | `packages/ok-playbook/templates/ARCHITECTURE.md` | onde foi copiado (consultar `OKPLAYBOOK.md`) |
| Perfis dev-early / dev-stable / review | seção correspondente vs arquivo solto | `packages/ok-playbook/patterns/profiles.md §<perfil>` | `.claude/profiles/<perfil>.md` |
| `git-rules.md` | conteúdo integral | `packages/ok-playbook/patterns/git.md` | `.claude/context/git-rules.md` |
| Bloco `ok-playbook` no CLAUDE.md | snippet delimitado | `packages/ok-playbook/install/claude-md-snippet.md` | bloco no `CLAUDE.md` do projeto |
| Permissões | itens do array `permissions.allow` | `packages/ok-playbook/install/permissions-snippet.json` | `.claude/settings.json` (ou `.settings.local.json`) |
| Skills dos agentes | `SKILL.md` aponta pro arquivo correto do submódulo | `packages/ok-playbook/agents/<nome>.md` | `.claude/skills/<nome>/SKILL.md` |

**Filtrar itens marcados como customização local** (seção "Customizações locais ignoradas no drift report" de `OKPLAYBOOK.md`). Esses entram no relatório só como nota informativa, não como decisão pendente.

Criar um TodoWrite com um item por verificação a fazer.

### 3. Detectar drift

Para cada item:

- **Drift binário (igual ou diferente):** comparar bytes (templates, git-rules, snippets).
- **Drift estrutural:** para permissões, comparar set de entradas em `permissions.allow` (adicionado/removido entre canon e local).
- **Drift de versão:** se o pattern de referência (ex: `superpowers-workflow.md`) mudou entre os SHAs, o bloco correspondente no `CLAUDE.md` provavelmente está defasado mesmo que o snippet do install não tenha mudado.

Classificar cada drift:
- **Update do playbook** — canon evoluiu e a cópia local ficou pra trás. Recomendação: atualizar.
- **Edição local** — usuário (ou outro agente) editou a cópia local sem refletir no playbook. Recomendação: decidir — promover pro playbook, marcar como customização, ou descartar.
- **Inconsistência declarada** — `OKPLAYBOOK.md` diz que componente X está ativo, mas o arquivo correspondente não existe (ou vice-versa). Recomendação: corrigir o manifesto.

### 4. Confirmar modo de operação

Antes de propor mudanças, perguntar:

> "Encontrei N drifts. Quer revisar **um a um** com diff + decisão, ou prefere que eu **proponha atualizar tudo** que veio do playbook (você ainda confirma o batch)?"

- **Um a um** — para cada item, mostrar:
  > "**[item]** — [tipo de drift]. Diff:
  > ```diff
  > <diff resumido>
  > ```
  > Decisão: (1) atualizar pro canon, (2) manter local, (3) marcar como customização local, (4) pular."
- **Batch** — listar todos os updates triviais (apenas tipo "update do playbook" sem edição local concorrente) e pedir OK no agregado. Itens com edição local concorrente sempre caem no modo um a um.

### 5. Aplicar decisões

Conforme a decisão de cada item:

- **Atualizar pro canon** — sobrescrever cópia local pelo conteúdo do submódulo. Para `CLAUDE.md`, substituir apenas o bloco delimitado (`## ok-playbook ...` até o próximo `## `).
- **Manter local** — não faz nada agora. Registrar a decisão temporariamente — se a divergência persistir na próxima auditoria, oferecer marcar como customização.
- **Marcar como customização local** — adicionar entrada em `OKPLAYBOOK.md` na seção "Customizações locais ignoradas no drift report" com path + razão (perguntar ao usuário a razão curta).
- **Pular** — registrar como pendente; auditoria futura volta a perguntar.

### 6. Atualizar `OKPLAYBOOK.md`

Sempre rodar ao final, mesmo se nenhuma decisão foi aplicada:

1. Mover versão antiga pra `OKPLAYBOOK.history/<timestamp>.md` (preservar histórico).
2. Re-gerar `OKPLAYBOOK.md` a partir do template, com:
   - SHA atualizado (= SHA atual do submódulo).
   - Componentes ativos (recalculados).
   - Mudanças aplicadas nesta auditoria (nova seção "Última auditoria: YYYY-MM-DD HH:MM").
   - Customizações locais consolidadas.
   - Próximos passos pendentes (decisões pulares ou itens "manter local" que podem virar customização).
3. Atualizar tabela "Histórico de upgrades" se SHA mudou de fato.

### 7. Relatório final

Resumir ao usuário:

> "Auditoria concluída.
> - SHA: `<antigo>` → `<novo>` (ou: `<sha>` (mesmo)).
> - Drifts encontrados: N (P aplicados, Q ignorados, R pulados).
> - Customizações locais agora: M (X novas nesta auditoria).
> - `OKPLAYBOOK.md` atualizado; histórico em `OKPLAYBOOK.history/<timestamp>.md`."

---

## Escopo do playbook-audit

**Audita:**
- Cópias locais de arquivos originalmente vindos do playbook (templates, perfis, snippets).
- Bloco "ok-playbook" no `CLAUDE.md` do projeto.
- Permissões do playbook em `.claude/settings.json`.
- Manifesto `OKPLAYBOOK.md` (versão registrada vs SHA atual).

**Não audita:**
- Patterns canônicos dentro de `packages/ok-playbook/patterns/` — esses **são** o canon; submódulo é a fonte de verdade.
- Arquivos do projeto fora do escopo do playbook (código, docs próprias, etc.).
- Agentes Igris-específicos ou outros agentes de domínio do projeto.

**Registra, mas não decide:**
- Inconsistências entre manifesto e estado real (ex: `OKPLAYBOOK.md` lista componente X mas o arquivo sumiu). Apresenta a inconsistência e pergunta a decisão.

---

## Regras invariantes

- **Nunca atualizar `OKPLAYBOOK.md` sem preservar o anterior** em `OKPLAYBOOK.history/`.
- **Nunca aplicar update sem mostrar diff** (mesmo no modo batch — diff agregado).
- **Nunca sobrescrever uma customização local marcada** (entradas em "Customizações locais ignoradas no drift report" são imutáveis pelo agente; só o usuário remove).
- **Nunca modificar arquivos dentro de `packages/ok-playbook/`** — submódulo é read-only do ponto de vista desta auditoria. Para evoluir o playbook, usar o fluxo descrito em [`../README.md §Como contribuir`](../README.md).
- **Nunca rodar `git submodule update --remote`** sozinho. Se o usuário quiser puxar nova versão do playbook, ele faz manualmente; este agente só audita o que já está em disco.
