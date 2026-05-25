# Permissions — Permissões do Claude Code

> **Escopo:** project-level. Consumido por `install/permissions-snippet.json` (items concretos) e por `install/claude-md-snippet.md` (ponteiro filosófico).

Filosofia de configuração de permissões em `.claude/settings.json`. O snippet em `install/permissions-snippet.json` entrega os items path-agnostic; este doc explica o porquê e cobre os casos especiais que o snippet não pode resolver automaticamente.

---

## Por que importa

Permissões apertadas demais geram prompts constantes de confirmação — o agente trava em operações previsíveis como `git status` ou `tsc`, quebrando o fluxo. Permissões largas demais criam risco: um subagente em loop pode fazer install global, reescrever configurações do sistema ou bagunçar `~/.claude/` sem aviso. O objetivo é deixar o agente fluir em operações **previsivelmente seguras** (leitura, build, testes) e pausar para confirmar em operações **potencialmente destrutivas** (rede ampla, install global, mexer em configs globais). A distinção não é sobre o comando em si, mas sobre o escopo de impacto que ele pode ter fora do projeto corrente.

---

## Categorias

| Categoria | Exemplos | Resolução |
|---|---|---|
| Path-agnostic | `Bash(git *)`, `Bash(node *)`, `WebSearch` | Entram no snippet, instalam diretos |
| Path-specific | `Bash(cd e:/<projeto>/.worktrees/* && *)` | INSTALL pergunta o path e gera as variantes |
| SO-specific | `Bash(cmd //c "mklink *")` (Windows) | Incluídas no snippet, marcadas como Windows-only |

---

## Recomendações por tipo de operação

| Tipo de operação | Recomendação | Exemplo |
|---|---|---|
| Leitura/listagem | Liberal — liberar sem restrição | `ls`, `cat`, `find`, `grep`, `git status`, `git log`, `git diff` |
| Build/test/dev tools | Liberal — liberar sem restrição | `node`, `npm`, `pnpm`, `tsx`, `tsc`, `vitest` |
| Edição local | Liberal — escopo do projeto | `mkdir`, `cp`, `mv`, `rm`, `touch`, `echo` |
| Rede pública | Conservador — escopo a localhost ou domínios específicos | `curl -s http://localhost:*` (sim); `curl https://*` (avaliar) |
| Mexer em `~/.claude/`, `~/.npmrc`, settings globais | Sempre confirmar — não liberar | Qualquer write fora do diretório do projeto |
| Install global | Sempre confirmar | `npm i -g`, `pip install --user` |

---

## Casos especiais

### Worktree no Windows: 8 variantes de quoting

Cada subagente pode formatar o `cd` de forma diferente: com `/d`, com quoting MSYS (`/e/...`) ou Windows (`e:/...` ou `e:\\...`), com letra de drive maiúscula ou minúscula. Para o Claude Code, cada combinação é uma permissão distinta — liberar uma não libera as outras. Por isso o snippet (e cada projeto que usa worktrees) precisa das 8 variantes:

```
Bash(cd /e/<proj>/.worktrees/* && *)
Bash(cd e:/<proj>/.worktrees/* && *)
Bash(cd "e:/<proj>/.worktrees/*" && *)
Bash(cd "E:/<proj>/.worktrees/*" && *)
Bash(cd "e:\\<proj>\\.worktrees\\*" && *)
Bash(cd "E:\\<proj>\\.worktrees\\*" && *)
Bash(cd /d "e:\\<proj>\\.worktrees\\*" && *)
Bash(cd /d "E:\\<proj>\\.worktrees\\*" && *)
```

Substituir `<proj>` pelo path real do projeto ao instalar.

### Windows `mklink`

`mklink` é builtin do `cmd.exe`, sem binário próprio. Pode ser invocado de duas formas dependendo do shell do subagente:

- MSYS/Git Bash: `cmd //c "mklink ..."` → permissão `Bash(cmd //c "mklink *")`
- PowerShell/cmd nativo: `cmd /c mklink *` → permissão `Bash(cmd /c mklink *)`

Ambas as variantes entram no snippet.

### `additionalDirectories`

Aponta para diretórios além do projeto principal que o agente deve conseguir ler e operar: junctions de worktrees (criadas com `mklink /J`) e diretórios irmãos relevantes (outro pacote do mesmo ecossistema mantido em paralelo, por exemplo). Editado diretamente em `settings.json`, fora do snippet — o path é sempre específico da máquina.

---

## Generalizar antes de salvar

Quando o Claude Code exibe o prompt "Always allow", a UI salva o pattern hiper-específico do comando atual — path completo, argumentos literais. Na próxima variação do mesmo comando (outro subagente, outra worktree, outra letra de drive) o agente trava de novo.

**Regra:** antes de confirmar um "Always allow", trocar o path único por `*` e manter os wildcards. Exemplo:

```
# Ruim — captura só este comando específico
Bash(cmd //c "mklink /J e:\<proj>\.worktrees\feat-x e:\<proj>")

# Bom — captura qualquer mklink futuro
Bash(cmd //c "mklink *")
```

O mesmo vale para paths de worktree, argumentos de teste, DATABASE_URL inline, etc. Qualquer detalhe único que muda entre execuções deve virar `*`.
