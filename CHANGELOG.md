# Changelog

## 1.4.0 — 2026-10-14

**Correções vistas nas primeiras migrações para a skill.**

- **Git de estado compartilhado sempre pergunta.** `stash drop|clear|pop`, `branch -D|-M|-f`, `worktree remove|prune|move`, `tag -d`, `update-ref -d` não são mais auto-aprovados pelo hook em escopo nenhum (antes, na worktree, eram) e entram em `permissions.ask` no snippet, para que `Bash(git *)` não os libere por rule. `reset --hard`/`clean`/`checkout -- .` na worktree continuam livres (só atingem a própria worktree).
- **`.claude/hooks/areas.local.json`.** Áreas do projeto (`scratch`, `leitura`) e bins próprios (`headsProjeto`) saem do `areas.mjs`, que volta a ser idêntico ao canon em todo projeto — atualizações chegam sem `customizado`. JSON ausente ou inválido = defaults (aprova menos, nunca mais).
- **Hook-tests sem placeholder:** IRMAO/SCRATCH/FORA vêm das áreas reais; sem projeto irmão, os casos dele são pulados com aviso.
- **`apply` limpa o legado 0.x, uma vez por projeto:** tira `Bash(rm *)`/`Bash(mv *)` do `allow` e troca o comando do hook antigo (`auto-approve-worktree-bash.js`, `auto-approve-project-bash.js`) pelo canônico — sem duplicar, preservando hooks próprios do mesmo matcher, e sem trocar se o projeto excluiu o hook canônico. O que o dono re-adicionar não é removido de novo. Relato em linhas `settings	…`.
- **Links markdown relativos ao arquivo:** `](<x-root>…)` nos itens materializados vira caminho relativo ao destino (skills, patterns, templates, `_index.md`); prosa e código continuam com o caminho a partir da raiz.
- **`worktree.mjs close`** apaga a pasta que sobra depois do `git worktree remove` (caminho > 260 no Windows) com um removedor próprio que nunca desce em link; arquivo preso → `FALTA:` dizendo qual.
- **`SKILL.md`:** áreas em `areas.local.json`; passo de preencher o `_index.md` semeado; tabela de verbos de processo nos complementos do `CLAUDE.md`; `--ignore-workspace` para projeto dentro de workspace pnpm de outro repositório; portar correções do canon para cópias `do-projeto` do `worktree.mjs`.

## 1.3.1 — 2026-10-14

- `README.md`: no topo, **"Quer entender antes de instalar?"** (prompt para o agente ler o repositório e explicar o efeito no projeto, sem instalar) e **Instalação** com prompt pronto, passos que o agente segue (clone direto na pasta de skills, link para o Codex, conferência, configuração) e como atualizar.
- `SKILL.md`: Modo 1 ganha o passo 9 (fecho: o que foi instalado, o que ficou de fora, o que cada sessão passa a fazer, onde ler depois); o modo Explicar cruza a visão geral com o que o projeto não configurado já tem, só lendo.

## 1.3.0 — 2026-10-14

**Apresentação para quem chega.**

- `references/patterns/visao-geral.md` (novo, materializado como pattern): o que o playbook muda no projeto, na visão de quem usa — pastas, o que o agente faz em toda sessão (perfil, sinal de atenção, feedback, pendências, permissões, memória), como conduz o trabalho (quatro fluxos, spec e plano — integrado ao superpowers, mas qualquer skill que produza spec e plano serve —, gate único, worktree, scripts de processo), uso com desk de workers, o que não faz sem o usuário, o que mexe na máquina e o que dá para recusar.
- `SKILL.md`: Modo 1 ganha o passo 1a (apresentar a visão geral e converter recusas em `--sem`/`--manter`); modo **Explicar** para "o que o ok-playbook faz?"; `when_to_use` com esse gatilho.
- `assets/rules.md` e `README.md` apontam para a visão geral.

## 1.2.0 — 2026-10-14

**Contribuição de fora chega como issue ou pull request.**

- `playbook-contribute`: `request` abre **issue** no repositório do playbook e `branch-pr` abre **pull request** (branch própria ou fork); `direct` segue para o mantenedor. O protocolo diz o que entregar, não a ferramenta — o agente usa o caminho que o ambiente tiver (`gh`, integração do GitHub, outra CLI) e, sem nenhum, entrega o texto pronto e o endereço. Publicar exige o sim do usuário ao texto final; a proposta sai sem nomes, caminhos e dados do projeto. Repositório do playbook = remote `upstream`/`origin` do clone ou o README.
- `upstream-proposal.md`: campo `issue_url`; status `sent` absorvido por `submitted`.
- `SKILL.md` (Modo 1): `contribuicao` = `direct` só para quem mantém o playbook; senão `request` (ou `branch-pr`).
- `README.md`: seção "Contribuindo".

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
