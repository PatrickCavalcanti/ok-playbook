# Changelog

## 1.1.1 — 2026-10-14

- Política "com desk": **desk de workers** passa a ser definido como conceito (orquestrador que lista o elenco de workers de várias CLIs, lê a cota de cada CLI e dispara workers); o Nidavellir fica como exemplo, com os nomes de ferramenta dele entre parênteses. Exemplo de gate com nomes de worker genéricos. Arquivos: `subagent-dispatch.md` §4.3, `superpowers-workflow.md`, `dev-process.md` §3 item 10, `assets/rules.md`.
- Repositório: removidos o histórico 0.x do CHANGELOG (fica no git) e anotação interna em `docs/insights/`.

## 1.1.0 — 2026-10-11

**Política de modelos deixa de ser fixa quando há desk de workers.**

- Invariante único: a revisão do conjunto / final roda no modelo mais forte disponível. Quem planeja e orquestra é a sessão aberta — o playbook não fixa o modelo dela.
- **Sem desk** (só subagentes da própria CLI): divisão por papel como antes — Scout/implementer/revisão de fase no modelo econômico (Sonnet), revisão final no mais forte (Opus).
- **Com desk (Nidavellir)**: o plano consulta `list_workers` e a cota das CLIs e cada task declara o worker que a implementa e o porquê (dificuldade × capacidade; cota); paraleliza em CLIs diferentes para render todas as cotas; o orquestrador gerencia os commits; o mapa task → worker vai no gate único; o orquestrador sugere troca de worker que se dá mal num tipo de trabalho.
- Tabela "Quem commita" (`superpowers-workflow.md`): com desk ou em fase paralela na mesma worktree, o controller commita (também em fase sequencial com desk); worktree própria → worker; capacidade do worker não autoriza decidir desenho; revisor final = maior capacidade entre os elegíveis, sem rebaixar por economia; troca de worker por desempenho não cobre BLOCKED por ambiguidade.
- Arquivos: `subagent-dispatch.md` §4 (4.1 Scout, 4.2 sem desk, 4.3 com desk; anti-padrões e checklist), `superpowers-workflow.md` (roteamento + exemplo de gate), `dev-process.md` §3 item 10, `assets/rules.md`.

## 1.0.1 — 2026-10-07

- `SKILL.md`: seção **"Migração de um projeto 0.x"** (M1–M6) — inventário, remoção do formato antigo por tipo (submódulo, dependência npm, cópia solta) junto com o reapontamento das referências, configuração com o que esperar no `plan`, fusão do CLAUDE.md regra a regra, provas e cuidado no merge. O Modo 1 detecta o formato antigo (passo 0) e desvia para ela.

## 1.0.0 — 2026-10-06

**Quebra de formato:** o playbook deixa de ser pacote instalado (npm/submódulo)
e vira skill que materializa o canon no projeto.

- Layout: `references/patterns`, `references/agents`, `assets/{rules.md,templates,hooks,scripts,settings-snippet.json}`, `VERSION`, `SKILL.md`.
- `scripts/ok-playbook.mjs` (plan/apply/status) + manifesto `ok-playbook.json` no projeto; substitui `ok-playbook init`, `ok-playbook.config.json` e `OKPLAYBOOK.md`.
- `playbook-audit` vira o modo atualizar/auditar da skill.
- Removidos: CLI (`bin/`, `cli/`), `INSTALL.md`, `install/claude-md-snippet.md`, schema do config.
- Processo: receita de commit paralelo com `git add` (cobre arquivo novo); contrato do banco de teste (nunca cria, um por checkout, criação só com sim isolado); troca de estratégia em review em loop; decisões pendentes `⟂` no plano; revisor de spec recebe a spec; teste por resultado, não contagem. `worktree.mjs`: commit de abertura com `.worktrees/` ignorado, linha-sinal em todo caminho.
- `worktree.mjs` de referência com `SUJO:` e `--commit-abertura`.
- Hooks: `settings-snippet.json` aponta para `.mjs` e registra também o hook de PowerShell.
- Licença MIT.
- Quem planejou executa; fluxo Processo distingue script que surge no meio de outro trabalho.
- Hook: PROJETO em tempo de execução (CLAUDE_PROJECT_DIR), sobe da worktree para a raiz.
- Política de modelos alinhada: revisão de fase (spec + qualidade) = Sonnet; revisão do conjunto/final = Opus.

### Migração de projetos 0.x
Ver `SKILL.md`, seção "Migração de um projeto 0.x" (desde 1.0.1).

## 0.x

Versões de quando o playbook era distribuído como pacote (npm/submódulo). O histórico fica no git (tags `v0.1.0`–`v0.5.0`).
