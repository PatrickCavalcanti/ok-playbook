# Worktree Partners

> **Padrão de desenvolvimento, project-agnostic.** Define quando e como usar git worktrees, e como configurar permissões do Claude Code pra que agentes operem dentro delas sem fricção. Plataforma base do documento: Windows. POSIX entra como evolução futura.
>
> **Quando este documento entrar em conflito com a prática, a prática vence — atualize o documento.**

---

## 1. Propósito

Worktree é zona de sacrifício. Isola uma branch de trabalho do checkout principal pra que agentes (subagents, implementers, reviewers) possam criar diretórios, junctions, arquivos temporários e cometer caos sem afetar o tronco.

Este doc serve a três usos:

1. **Direcionar** quem está prestes a criar uma worktree — saber quando vale, como criar, como nomear.
2. **Configurar permissões** do Claude Code (`.claude/settings.json`) pra que agentes operem fluidamente dentro de `.worktrees/`.
3. **Verificar** se um projeto está pronto pra rodar worktrees — checklist auto-aplicável pelo skill `update-config`.

---

## 2. Como usar este doc

**Modo criação.** Antes de criar uma worktree, leia §3 a §5. Se é o primeiro uso no projeto, leia também §6 (permissões) e rode a verificação do §11.

**Modo verificação.** Aciona o skill `update-config` apontando pra este doc. Ele lê os snippets de §6, compara com o `.claude/settings.json` do projeto, e propõe os ajustes que faltam. **Não é automático** — só roda quando o usuário pede ("verifica permissões de worktree pra esse projeto").

---

## 3. Quando criar uma worktree

**MUST — usuário decide.** Claude Code não cria worktree sozinho. Skills (`brainstorming`, `writing-plans`, `subagent-driven-development`) que sugerem worktree no início do fluxo são ignorados nessa parte — só cria quando o usuário pedir explicitamente.

**Fase apropriada.** Brainstorming, escrita de spec e escrita de plano vivem em `main` (ou na branch atual) sem isolamento — são docs em `docs/` ou similar. Worktree faz sentido quando começa a tocar código de produção:

| Fase | Onde mora |
|---|---|
| Brainstorming | branch atual (main em geral) |
| Spec (`docs/...`) | branch atual |
| Plano (`docs/...`) | branch atual |
| Implementação (dispatch de subagentes ou execução inline) | **worktree** |

**Casos típicos onde vale criar:**

- Plano de implementação não-trivial (3+ tasks, vai durar mais que uma sessão).
- Trabalho experimental que pode ser descartado se der ruim.
- Tarefa que precisa rodar dev server / testes pesados em paralelo com outras frentes em main.

**Casos onde NÃO vale:**

- Edição de 1 arquivo com 1 commit no fim.
- Refactor in-place que vai ser revisado e commitado em seguida.
- Mudanças em docs/configs sem código.

---

## 4. Convenções de localização e naming

**Localização: `<project-root>/.worktrees/<feature-name>/`.**

Project-local (não global, não fora do projeto). Hidden via prefixo `.` pra reduzir poluição visual no listing.

**`.gitignore` MUST cobrir `.worktrees/`.** Não-negociável. Worktree contém node_modules junctions e estado de build — não pode ir pra origem.

```gitignore
.worktrees/
```

**Naming.**

| Convenção | Exemplo |
|---|---|
| Worktree dir | `<feature-name>` em kebab-case |
| Branch | `feature/<feature-name>` ou convenção do projeto |
| Match entre os dois | nome igual nos dois lugares — facilita correlação |

Ex: branch `feature/visual-markdown-editor` → `.worktrees/visual-markdown-editor/`.

---

## 5. Setup técnico

### 5.1 Criação canônica

```bash
git worktree add .worktrees/<feature-name> -b feature/<feature-name> main
```

A worktree parte do commit atual da branch base (`main` no exemplo). **Arquivos uncommitted no checkout principal NÃO vão pra worktree.** Se você acabou de escrever uma spec ainda não commitada, ou commite antes, ou copie pra worktree depois.

### 5.2 Estratégia de dependências

Worktrees compartilham `.git` mas têm working tree separado — por padrão, sem `node_modules`. Há duas estratégias. **Escolha pelo gerenciador e tipo de projeto** (critério objetivo abaixo), não por default cego.

**Critério de escolha:**

| Situação | Estratégia |
|---|---|
| **pnpm** (qualquer projeto) | **B (install real)** — ver aviso pnpm abaixo |
| Projeto single-package (sem workspace packages locais não-compilados) | **B (install real)** |
| Monorepo **npm/yarn** com workspace packages locais não-compilados, onde reinstalar é caro/quebra | **A (junction)** |

> ⚠️ **pnpm + junction NÃO funciona — e é perigoso.** Com pnpm, qualquer `pnpm <script>`/`pnpm exec` dispara `verify-deps-before-run` → `runDepsStatusCheck`, que vê o `node_modules` junctionado como "fora de sync" e tenta `pnpm install`, o qual quer **purgar o modules dir** (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Overrides (`npm_config_verify_deps_before_run=false`, `.npmrc` com `verify-deps-before-run=false`) **não surtem efeito** (validado em pnpm 11.x). Pior: se a purga prosseguir (`CI=true`) ou se um `rm -rf`/`git worktree remove` seguir o link no Windows, atinge o **`node_modules` do checkout principal** — risco real de corromper a main (incidente documentado). Por isso: **pnpm → sempre Strategy B.** E o argumento "evita reinstalar tudo" da Strategy A não vale pra pnpm — o store global content-addressable hardlinka um `pnpm install` na worktree em ~3.5s.

**Estratégia B — Install real no worktree (default p/ pnpm e single-package).**

Roda o install na worktree como um clone novo. Em pnpm é quase instantâneo (store global hardlinkado).

```bash
cd <project-root>/.worktrees/<feature-name>
pnpm install        # ~3.5s via store global; ou `npm install`
```

Submódulos só-de-docs e deps git-tag resolvem normalmente; submódulo não-inicializado na worktree é ignorado pelo pnpm se não for workspace package. Quebra só em monorepo com workspace packages locais não-tracked — esse é o caso da Strategy A.

**Estratégia A — Junction de node_modules (só monorepo npm/yarn c/ libs locais).**

Aponta o `node_modules` da worktree pro do checkout principal — evita reinstalar quando o monorepo tem workspace packages locais que `npm install` na worktree não resolve. **Não usar com pnpm** (aviso acima). **Use path ABSOLUTO** — o relativo erra a profundidade fácil e o erro fica mascarado (§5.3):

Windows:

```cmd
cd <project-root>\.worktrees\<feature-name>
mklink /J node_modules <ABSOLUTE_PATH>\node_modules
```

(ex.: `mklink /J node_modules E:\Projetos\MyApp\node_modules`. Para `node_modules` hoisted por package, criar junction também em cada `packages/<name>/node_modules` apontando pro absoluto correspondente.)

POSIX:

```bash
ln -s "<project-root>/node_modules" node_modules
```

**Limitação:** mudanças em `package.json` na worktree não atualizam deps (e `npm install` ali quebra). Instalar a dep no checkout principal (`npm install --no-save <pkg>`); junction picks up.

### 5.3 Pegadinhas comuns

| Sintoma | Causa | Fix |
|---|---|---|
| `npm install` falha com 404 em workspace package | Workspace local não-tracked (existe só no checkout principal) | Copiar pasta do workspace pra worktree manualmente, ou usar junction |
| `npm install` falha com `upload-pack: not our ref` | Submódulo com commit local não-pusheado | Pular submódulos: `git submodule update --init --recursive --remote` falha; use junction |
| Spec/plano que acabei de escrever sumiu na worktree | Arquivo uncommitted no main não vai pra worktree | Commit antes de `git worktree add`, ou copia o arquivo manualmente |
| Tests acham `node_modules` mas não acham `react` | npm workspaces hoist parcial | Junction adicional em `packages/<frontend>/node_modules` |
| `pnpm <script>`/`pnpm exec` na worktree tenta reinstalar/purgar (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` ou `ENOTDIR`) | pnpm `verify-deps-before-run` vê o junction "fora de sync"; com risco de purgar o `node_modules` da main | **Não usar junction com pnpm** — usar Strategy B (install real). Se já está em junction, invocar binários via `node_modules/.bin/<bin>` direto contorna pontualmente, mas a solução é reinstalar. |
| `react` resolve mas `node_modules/.bin/` "não existe" na worktree | junction `mklink ..\..\..` apontou um nível **acima** do projeto (Node sobe na árvore e acha o node_modules real, mascarando a junction quebrada) | Recriar a junction com **path absoluto** (`mklink /J node_modules E:\...\<proj>\node_modules`) |

---

## 6. Permissões do Claude Code em worktrees

**Princípio mestre:** liberdade total dentro de `.worktrees/`, granular fora.

A worktree é descartável. Se um agente faz besteira lá dentro, custa um `git worktree remove`. Já fora dela, especialmente no checkout principal, cada ação destrutiva precisa de aprovação explícita.

A implementação canônica desse princípio mudou. **Versões anteriores deste doc recomendavam 8 regras compound (`Bash(cd <path> && *)`) cobrindo variantes de quoting.** Essa abordagem é obsoleta — não funciona. A nova recomendação é um **PreToolUse hook**.

### 6.1 Por que rules não bastam (matcher behavior)

O matcher de permissões do Claude Code tem duas restrições que tornam `cd <path> && <cmd>` ingovernável por rules:

1. **Compound `&&` é fatiado em subcomandos.** A doc oficial ([permissions](https://code.claude.com/docs/en/permissions)) diz "rule must match each subcommand independently". Mas empiricamente, ter `Bash(cd *)` e `Bash(git *)` separados **não** libera `cd <path> && git status` — `cd` é tratado como "context-changing" (igual runners tipo `devbox run`) e exige regra combinada explícita.
2. **Wildcards no inner segment não expandem.** Patterns tipo `Bash(cd <path> && *)` com `*` no inner não casam comandos reais. Só `Bash(cd <path> && <cmd> *)` literal no head do inner casa — gerando explosão (N variantes de path × M comandos = 100+ rules).
3. **Edições em `.claude/settings.json` não recarregam mid-sessão** (apenas o diálogo "Yes don't ask again" atualiza memória + disco). Toda mudança em rules exige reload window pra entrar em vigor.

Detalhes e referências em [`./permissions.md §Quando rules não bastam`](./permissions.md).

### 6.2 Solução canônica: PreToolUse hook

Um único script Node.js intercepta toda call do Bash tool, faz regex contra o `command`, e retorna `allow` para `cd <worktree-do-projeto> && <comando-whitelisted>`. Cobre todas as variantes de quoting numa regex; cobre chains múltiplos (`&& A && B`); whitelist é um Set no JS, fácil de editar.

**Template canônico:** [`../install/hooks/auto-approve-worktree-bash.js`](../install/hooks/auto-approve-worktree-bash.js). Tem um placeholder `<PROJECT_PATH>` substituído na instalação pelo path real do projeto (ex: `projetos/igris`).

**Whitelist default** (dev típico + toolchain de build/test/migration):

`git, node, npm, pnpm, npx, tsx, tsc, vitest, vite, eslint, prettier, ok-bridge, drizzle-kit, ls, cat, find, grep, head, sed, wc, pwd, mkdir, cp, mv, rm, touch, echo`

> O template aplica `commandBasename()` ao head de cada segmento, então binários invocados via path relativo (`node_modules/.bin/vitest` → `vitest`) casam o whitelist. Isso é **essencial**: tanto na Strategy B quanto via junction, o tooling roda como `node_modules/.bin/<bin>` (porque `pnpm exec` quebra em worktree). Sem o basename, cada chamada geraria prompt. Inclua na whitelist os bins reais do projeto (ex.: `ok-bridge`, `drizzle-kit` para projetos ok-data-bridge; `vite`/`vitest` para Vite).

**Configuração em `.claude/settings.json`** (relativa a `${CLAUDE_PROJECT_DIR}`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PROJECT_DIR}/.claude/hooks/auto-approve-worktree-bash.js"
          }
        ]
      }
    ]
  }
}
```

**Bonus comprovado empiricamente:** hooks recarregam sem precisar de reload window (diferente de rules). Editar o whitelist do `.js` ou trocar a regex entra em vigor imediatamente.

### 6.3 O que NÃO vai pro hook (continua como rules normais)

Operações que **não** começam com `cd <worktree>` ou não fazem chain, continuam dependendo de rules em `permissions.allow`:

```json
{
  "permissions": {
    "allow": [
      "Bash(git worktree *)",
      "Bash(git -C *.worktrees/* *)",
      "Bash(git -C *.worktrees\\* *)",
      "Bash(rm -rf *.worktrees/*)",
      "PowerShell(New-Item *)",
      "PowerShell(Remove-Item *.worktrees*)",
      "Bash(cmd //c \"mklink *\")",
      "Bash(cmd /c mklink *)"
    ]
  }
}
```

| Categoria | Por que rule e não hook |
|---|---|
| `git worktree add/list/remove/prune` | Não tem `cd` antes — comando direto |
| `git -C <path>` | Usa `-C` em vez de `cd && git` — fora do padrão do hook |
| `rm -rf .worktrees/*` (cleanup) | Não tem `cd` antes |
| `mklink` / `New-Item` (junction setup) | Não tem `cd` antes |

### 6.4 O que NÃO generalizar em hook nem rule

Resista à tentação de adicionar ao whitelist do hook (ou rule global):

- `curl https://*` (rede pública) — exfiltration risk.
- `npm install -g`, `pip install --user` — install global escapa o escopo da worktree.
- `git push *` — push afeta remote, escopo errado pra "liberdade dentro da worktree".
- `git reset --hard *` — afeta history, mesmo dentro da worktree pode destruir trabalho não-pusheado.

Esses ficam pontuais — aprovados via diálogo quando necessário, ou rules específicas com path muito constrained (`Bash(curl -s http://localhost:*)`).

### 6.5 Auditoria de permissões existentes

Antes de adicionar/editar, rodar:

- **Em projeto novo (sem hook ainda):** seguir [`../INSTALL.md`](../INSTALL.md) §5 (instalação de hook + rules complementares).
- **Em projeto existente (migrando das 8 variantes obsoletas):** rodar [`../agents/playbook-audit.md`](../agents/playbook-audit.md) — detecta drift entre cópia local e canon, oferece adotar o hook approach.
- **Pra avaliar prompts recorrentes em uso:** rodar [`../agents/permissions-review.md`](../agents/permissions-review.md) — propõe atualizações no whitelist do hook ou rules complementares.

---

## 7. Workflow dentro da worktree

**Skill define a estrutura.** A escolha entre per-task commits, batched commits, per-task tests, etc., é decisão do skill que está executando o plano (`subagent-driven-development`, `executing-plans`, ou execução manual).

**Default recomendado: per-task quando possível.**

Com permissões configuradas conforme §6, o motivo histórico pra batchar tudo no fim (prompt-spam em git status/diff/commit) **deixa de existir**. Volta-se ao padrão canônico:

- **Per-task commits** — granularidade facilita revert, bisect, e recuperação parcial.
- **Per-task tests** — TDD vira viável de novo; bugs aparecem na task em que foram introduzidos.
- **Per-task reviews** (spec reviewer + code quality reviewer entre tasks) — quando o plano tiver risco arquitetural alto.

**Não é obrigatório.** Planos curtos ou com tasks fortemente acopladas podem optar por batch no fim. Decisão do plano + skill, não regra global.

### 7.1 Regras que permanecem (independente de skill)

- **Subagents não instalam deps.** Controller faz install/junction antes do dispatch.
- **Subagents não tomam decisão arquitetural sozinhos.** Quando aparece dúvida não-coberta no plano, escalar (BLOCKED / NEEDS_CONTEXT).
- **Antes de qualquer commit:** rodar `git diff --cached --stat` pra confirmar o que vai entrar. Staging pré-existente do user ou de outro agente pode contaminar.
- **Em multi-repo (ex: projeto principal + sidecar):** sempre `git -C <path>` em vez de confiar no cwd. cwd dá drift em sessões longas.

Detalhes específicos do dispatch de subagentes em [`./subagent-dispatch.md`](./subagent-dispatch.md).

---

## 8. Operações multi-repo

Quando o trabalho cruza repos (ex: feature toca o projeto principal + um service satellite em outro path), as armadilhas:

- **cwd drift do shell.** Bash mantém cwd entre chamadas mas você pode esquecer onde estava. Mitigação: `git -C <path>` em **toda** operação de git.
- **Permissões cruzadas.** Worktrees do projeto principal não dão liberdade no satellite. Cada repo precisa do próprio bloco em `.claude/settings.json`.
- **Sincronização de versão.** Mudança no projeto principal que depende de mudança no satellite — fazer no satellite primeiro, instalar, depois consumir.

---

## 9. Cleanup

Quando a feature foi mergeada (ou descartada):

```bash
# Branch ainda existe + worktree existe
git worktree remove .worktrees/<feature-name>
git branch -d feature/<feature-name>          # ou -D se descartando sem merge

# Se a worktree foi deletada manualmente sem usar git worktree remove:
git worktree prune
```

**Não deletar `.worktrees/<name>` com `rm -rf`** sem antes rodar `git worktree remove` ou `git worktree prune` — git mantém referência interna em `.git/worktrees/` que vira lixo dangling.

> 🛑 **Windows + junction — ordem obrigatória (risco de corromper a main).** Se a worktree usa junction de `node_modules` (Strategy A), **remova o junction PRIMEIRO** com `rmdir` (sem `/S` — remove só o reparse point, não o alvo) **antes** de qualquer `git worktree remove`/`rm -rf`:
>
> ```cmd
> cd <project-root>\.worktrees\<feature-name>
> rmdir node_modules            REM remove só o link, não o node_modules da main
> cd <project-root>
> git worktree remove .worktrees\<feature-name>
> ```
>
> **Nunca** rodar `rm -rf` (ou `git worktree remove --force`) sobre um diretório que ainda contém um junction: no Windows o delete recursivo **segue o link e apaga o conteúdo do alvo** — ou seja, o `node_modules` do checkout principal. Incidente real: após isso, `npm run dev` na main falhou com `MODULE_NOT_FOUND vite`; recuperação só com `CI=true pnpm install`. (Mais uma razão pra preferir Strategy B, que não tem junction pra limpar.)

---

## 10. Anti-padrões

| Anti-padrão | Por quê |
|---|---|
| Criar worktree sozinho (sem usuário pedir) | Worktree tem custo de setup; só vale quando o usuário decidiu que vale |
| Criar worktree durante brainstorming/spec/plano | Esses artefatos são docs — não precisam de isolamento |
| Adicionar 8 variantes `Bash(cd <path> && *)` em settings.json | Não funcionam (matcher não expande `*` no inner); usar hook em vez disso |
| Adicionar `Bash(cd <path> && <cmd> *)` por comando × 8 variantes | Funcionaria, mas vira 100+ rules; usar hook é dramaticamente mais limpo |
| Editar `.claude/settings.json` esperando que recarregue mid-sessão | Só hooks recarregam ao vivo; rules exigem reload window |
| Adicionar comando alto-risco ao whitelist do hook (`curl`, `npm install -g`, `git push`) | Hook auto-aprova qualquer chain com esses heads dentro de worktree — vetor de exploração se subagente for comprometido |
| Despachar subagente esperando que `isolation: worktree` opere numa worktree nomeada existente | Esse mode cria worktree TEMPORÁRIA descartável em `.claude/worktrees/agent-<hash>`; bom só pra spike isolado, não pra trabalho continuado |
| Rebase de `main` de dentro de uma worktree | Mexe na branch base de todas as worktrees ao mesmo tempo |
| `rm -rf <worktree>` manual sem `git worktree remove` | Deixa referência dangling em `.git/worktrees/` |
| `mklink` apontando pra path sensível (`.ssh/`, `~/.config/` de outros) | Junction segue o link; expõe conteúdo arbitrário ao subagente |
| Commit em multi-repo confiando no cwd | Use `git -C <repo>` — cwd drifta em sessões longas |
| Instalar deps no subagente (em vez do controller) | Subagentes não devem mexer em deps; controller mantém install/junction |

---

## 11. Checklist de verificação

Pra o skill `update-config` (ou auditoria manual) rodar contra um projeto:

### Configuração de projeto

- [ ] `.gitignore` cobre `.worktrees/`
- [ ] Existe `.claude/settings.json` (ou `.claude/settings.local.json` se preferência local)

### Hook + permissões mínimas (§6.2, §6.3)

- [ ] Existe `.claude/hooks/auto-approve-worktree-bash.js` com `<PROJECT_PATH>` substituído pelo path real (lowercase, slashes)
- [ ] `.claude/settings.json` tem bloco `hooks.PreToolUse[].matcher: "Bash"` apontando pro script
- [ ] **NÃO** existe mais o bloco antigo de 8 variantes `Bash(cd <path> && *)` em `permissions.allow` (resíduo obsoleto — remover)
- [ ] Rules complementares presentes em `permissions.allow`:
  - [ ] `Bash(git worktree *)`
  - [ ] `Bash(git -C *.worktrees/* *)` e variante backslash (Windows)
  - [ ] `Bash(rm -rf *.worktrees/*)` + `PowerShell(Remove-Item *.worktrees*)` pra cleanup
  - [ ] `Bash(cmd //c "mklink *")` e `Bash(cmd /c mklink *)` (Windows) ou `Bash(ln -s *)` (POSIX)
  - [ ] `PowerShell(New-Item *)` (Windows)

### Anti-padrões a confirmar ausentes (§6.4)

- [ ] **NÃO** existe `curl https://*` no whitelist do hook
- [ ] **NÃO** existe `Bash(npm install -g *)` global
- [ ] **NÃO** existe `Bash(rm -rf *)` global (sem prefixo `.worktrees/`)
- [ ] **NÃO** existe `Bash(git push *)` global
- [ ] **NÃO** existe `Bash(git reset --hard *)` global

### Estratégia de dependências da worktree (§5.2)

- [ ] Gerenciador é **pnpm**? → worktree usa **install real** (Strategy B), NÃO junction
- [ ] Projeto single-package (sem workspace packages locais não-compilados)? → Strategy B
- [ ] Só monorepo **npm/yarn** com libs locais justifica junction (Strategy A); se usar, com **path absoluto**
- [ ] Worktree existente: tem `node_modules` real (install), não junction quebrada? (`ls node_modules/.bin/` deve listar os bins)

### Sanidade do checkout principal

- [ ] `node_modules` (raiz) existe e está com deps instalados — (na Strategy A, o junction não tem o que apontar sem isso)
- [ ] Em monorepo: `node_modules` de cada package também populado

---

## 12. Inspirações e evolução

Este doc é vivo. Padrões mudam, plataformas evoluem, monorepos descobrem novos jeitos de quebrar `npm install`. Quando um padrão novo aparece em uso real, validar em 2+ projetos antes de canonizar aqui.

**Para evoluir:**

- Caso novo de quebra de setup → §5.3 (pegadinhas comuns)
- Padrão de permissão novo descoberto → §6.2
- Anti-padrão novo identificado → §10
- Adaptação POSIX validada → seção POSIX (ainda não escrita; criar quando houver experiência consolidada)

Mudanças aplicadas via PR + revisão. Sem mudança silenciosa.
