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

### Worktree no Windows: por que rules não bastam

Cada subagente pode formatar o `cd` de forma diferente: com `/d`, com quoting MSYS (`/e/...`) ou Windows (`e:/...` ou `e:\\...`), com letra de drive maiúscula ou minúscula, com/sem aspas. Pra Claude Code, cada combinação é uma permissão distinta — liberar uma não libera as outras.

Versões anteriores deste doc enumeravam 8 variantes de `Bash(cd <path> && *)`. **Essa abordagem não funciona** porque o matcher não expande `*` no inner segment (ver §"Quando rules não bastam"). A variação com inner literal — `Bash(cd <path> && <cmd> *)` — funciona mas explode pra 8 variantes × N comandos = 100+ rules.

**Solução canônica para worktree:** PreToolUse hook ([`../install/hooks/auto-approve-worktree-bash.js`](../install/hooks/auto-approve-worktree-bash.js)). Detalhes em [`./worktree.md §6.2`](./worktree.md).

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

---

## Quando rules não bastam: PreToolUse hooks

Rules em `permissions.allow` cobrem ~95% dos casos. Os 5% que **não funcionam por rule** caem em três categorias:

1. **Comandos compostos com `cd <path> && <cmd>`** — o matcher trata `cd` como context-changing (igual `devbox run`), exigindo regra combinada explícita. Patterns como `Bash(cd <path> && *)` com wildcard inner **não casam**. Patterns `Bash(cd <path> && <cmd> *)` com literal inner funcionam mas explodem pra N variantes de path × M comandos = 100+ rules.
2. **Edições em `.claude/settings.json` não recarregam mid-sessão.** Apenas o diálogo "Yes don't ask again" atualiza memória + disco simultaneamente. Toda mudança em rules exige reload window.
3. **Patterns muito dependentes de string-shape do comando** (quoting, casing, separadores de path) — onde a explosão combinatória vence a tentativa de generalizar.

Pra esses casos, a saída canônica é **PreToolUse hook**: um script que intercepta toda call do tool especificado, executa lógica programática (regex, whitelist, validação) e retorna decisão `allow` / `deny` / `defer` (cai no permission system normal).

### Quando alcançar pelo hook

| Sinal | Indicação |
|---|---|
| Mesmo padrão repetindo 8+ variantes em rules | Hook é mais limpo |
| Patterns que exigem combinação inviável por rule (cd-compound, runner+inner-cmd, etc) | Hook é a única solução |
| Editar `WHITELIST` ao longo do tempo é mais natural que editar JSON | Hook |
| Comportamento depende de **conteúdo** do comando, não só prefix matching | Hook |
| Caso pontual (1-2 comandos) | Rules — hook é overkill |

### Estrutura do hook

Hooks são configurados em `.claude/settings.json` na chave top-level `hooks`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PROJECT_DIR}/.claude/hooks/<nome>.js"
          }
        ]
      }
    ]
  }
}
```

Hook recebe o evento via **stdin como JSON** (campos: `tool_name`, `tool_input.command`, `cwd`, `session_id`, etc.) e responde via **stdout JSON** com `hookSpecificOutput.permissionDecision` ∈ `{allow, deny, ask}`. Exit 0 sem output = defer (cai no permission system normal). Doc oficial: [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks).

### Template canônico do playbook

[`../install/hooks/auto-approve-worktree-bash.js`](../install/hooks/auto-approve-worktree-bash.js) é o template canônico — auto-aprova `cd <project-worktree> && <whitelisted-cmd>` chains. Parametrizado por `<PROJECT_PATH>` (substituído na instalação). Use-o como base pra novos hooks.

### Vantagens descobertas em uso

- **Hot-reload:** hooks recarregam sem precisar de reload window (diferente de rules — confirmado empiricamente).
- **Manutenção:** editar 1 whitelist em JS é mais legível que editar 8×N entradas JSON.
- **Cobertura:** uma regex no JS cobre todas as variantes de quoting/casing/separator que rules exigiriam enumerar.
- **Lógica composicional:** hook pode checar múltiplas condições (path + whitelist de comandos + sem operators perigosos), coisa que pattern matching de rule não faz.

### Cuidados

- **Hooks não bypassam regra `deny` explícita.** Se houver rule de deny matching o comando, hook approve não vence.
- **Whitelist no hook é vetor de ataque se subagente comprometido.** Auto-aprova qualquer chain que comece com whitelist head — então `cd <worktree> && git log` aprovado leva também `cd <worktree> && git log; rm -rf ~` se o hook não checar separadores adicionais. O template canônico **só split em `&&`**, então `;`/`|`/`||` cairiam em segmentos que precisariam estar todos no whitelist — proteção parcial mas existe.
- **Não duplicar lógica do permission system.** Hook é pra casos onde rule não consegue expressar; pra approve simples (`Bash(git *)` etc), rule continua certa.
