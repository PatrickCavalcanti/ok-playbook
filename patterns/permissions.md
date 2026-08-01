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

**Solução canônica:** PreToolUse hook ([`../install/hooks/auto-approve-project-bash.js`](../install/hooks/auto-approve-project-bash.js)) — que cobre o root do projeto tanto quanto a worktree, porque o root é onde estão a maioria das chamadas. Detalhes em [`./worktree.md §6.2`](./worktree.md).

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

> 🎯 **A causa raiz não é cobertura, é variedade de forma.** Toda ação tem cinco formas de ser escrita e o agente escolhe livremente a cada chamada — nenhum allowlist cobre isso. Reduzir as formas ataca a causa; caçar variantes ataca o sintoma. Ver [`./command-forms.md`](./command-forms.md), que é curto de propósito.

> ⚠️ **Antes de ler o resto: MEÇA.** O sintoma "peço permissão o tempo todo mesmo com o allowlist certo" quase nunca é falta de regra — é **formato de comando**. Rode `install/hooks/tools/medir-comandos.mjs` antes de editar qualquer allowlist. Sem medir, cada prompt vira uma entrada nova que também não vai casar, e o `settings.local.json` acumula literais gigantes que servem a um comando só.

Rules em `permissions.allow` cobrem a maioria dos casos **quando o comando é simples**. O que **não funciona por rule**:

1. **Comandos compostos com `cd <path> && <cmd>`** — o matcher trata `cd` como context-changing (igual `devbox run`), exigindo regra combinada explícita. Patterns como `Bash(cd <path> && *)` com wildcard inner **não casam**. Patterns `Bash(cd <path> && <cmd> *)` com literal inner funcionam mas explodem pra N variantes de path × M comandos = 100+ rules.

   **Este é o caso dominante, e não é sobre worktree.** Medido em dois projetos independentes: Ariadne 846/1186 (71%) e Igris 1173/1694 (69%) das chamadas Bash começam com `cd` — e a maioria aponta pro **root do projeto** (Igris: 648 root × 214 worktree). Um hook que só cobre `.worktrees/` deixa descoberta a maior parte das sessões: a cobertura medida dessa versão foi de **8,7%** (Igris) a **17,3%** (Ariadne), com o prompt continuando a aparecer o tempo todo.

2. **Edições em `.claude/settings.json` não recarregam mid-sessão.** Apenas o diálogo "Yes don't ask again" atualiza memória + disco simultaneamente. Toda mudança em rules exige reload window. **Hooks recarregam ao vivo.** Essa assimetria é o que faz um conserto correto parecer que não funcionou — e leva a empilhar mais regras que também não casam. Por isso o conserto mora no hook.

3. **Patterns muito dependentes de string-shape do comando** (quoting, casing, separadores de path) — onde a explosão combinatória vence a tentativa de generalizar.

### A lista de "nunca" mora em `deny`, não na ausência de `allow`

Não adianta *deixar de listar* `git push --force` esperando que ele peça confirmação: qualquer regra larga (`Bash(git *)`) já o aprova, e o whitelist do hook — que espelha as rules — herda a folga junto. Ausência de allow é derrotada por permissividade em qualquer camada.

`permissions.deny` ganha das duas: **hook não bypassa deny**. É lá que a lista de nunca deve morar.

```json
{
  "permissions": {
    "deny": [
      "Bash(git push --force*)", "Bash(git push -f*)",
      "Bash(git reset --hard*)", "Bash(git clean -*f*)",
      "Bash(npm install -g*)", "Bash(pnpm add -g*)",
      "Bash(npm publish*)"
    ]
  }
}
```

Com o `deny` no lugar, o whitelist do hook pode ser generoso sem virar risco — que é o ponto: fricção baixa no caminho comum, barreira dura só onde importa.

### O whitelist do hook espelha as rules

O hook existe pra impedir que um comando **já permitido pelas rules** seja barrado por detalhe de matching de string (o `cd`). Onde uma rule é limitada por argumento (`curl *localhost*`, `docker logs|ps|inspect *`, `rm -rf *.worktrees/*`), **reproduza a limitação** no hook em vez de liberar o head inteiro.

Errar pro lado restrito custa **prompt, não bloqueio** — o hook nunca emite `deny`, só `allow` ou silêncio (defer, que devolve a decisão ao permission system). Isso é o que permite escrever hook com confiança: o pior caso de um bug no parser é a fricção que você já tinha.

### Quatro áreas, quatro políticas

O template canônico não trata todo diretório igual. A distinção que importa não é "dentro ou fora do projeto", é **quanto custa perder o que está ali**:

| Área | Política |
|---|---|
| `<projeto>/.worktrees/…` | Descartável — destrutivo livre (`rm`, `mv`, `git reset --hard`) |
| `<projeto>` (root) | Checkout de verdade — **sem destrutivo**, pede confirmação |
| Scratch (`/tmp`, temp do Claude) | Descartável por definição — escrita livre |
| Projetos irmãos | **Só leitura** — escrita sempre pede |

A área de leitura não é uma restrição técnica, é um padrão de trabalho: **trabalho que cruza pra um projeto irmão se resolve com um artefato, não com acesso.** Leia à vontade (o irmão tem os próprios `CLAUDE.md`, docs e convenções — dá pra entender o contexto inteiro sem escrever nada), escreva **uma** spec ou plano completo lá, e execute numa sessão aberta dentro daquele projeto, sob as regras dele. A escrita desse único arquivo pede permissão, e o prompt vira checkpoint útil em vez de fricção.

### Roteiro de diagnóstico (5 passos)

As três ferramentas em [`../install/hooks/tools/`](../install/hooks/tools/) derivam o diretório de transcripts do `cwd` e o hook do próprio path — rodam em qualquer projeto sem edição.

```bash
# 1. MEDIR ANTES. Mostra o % com `cd`, pra onde apontam, e os heads reais.
node .claude/hooks/tools/medir-comandos.mjs

# 2. Cobertura da versão atual do hook (baseline).
node .claude/hooks/tools/hook-replay.mjs

# 3. Portar o hook; ajustar PROJETO, SCRATCH, LEITURA e os whitelists com o
#    que o passo 1 mostrou.

# 4. Suite de casos — os NEGATIVOS são o que importa.
node .claude/hooks/tools/hook-test.mjs

# 5. Cobertura depois + o que sobrou e por quê.
node .claude/hooks/tools/hook-replay.mjs --porques
```

No passo 5, separe **recusa legítima** (comando fora das áreas, destrutivo no root, escrita em projeto irmão, `cd "$VAR"` cujo destino não dá pra provar) de **falso negativo do parser** (formato que o hook não entendeu). Só o segundo grupo justifica mexer no código. Referência de cobertura alcançada: **95%** no Igris, **87%** no Ariadne — o resto era recusa legítima.

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

### PowerShell tem a mesma doença — e precisa do mesmo hook

Em máquina Windows a tool PowerShell não é detalhe: medido no Igris, **376 chamadas = 17,1% de todo o shell**, e **56% começam com `Set-Location`/`cd`**. Pior, 39 começam com atribuição (`$x = (Select-String …)`), que esconde o cmdlet do matcher — `PowerShell(Select-String *)` nunca casa. Sem hook, praticamente toda chamada PowerShell pede permissão.

O template traz **dois hooks** (`auto-approve-project-bash.mjs` e `auto-approve-project-powershell.mjs`) sobre **uma política única** em [`../install/hooks/lib/areas.mjs`](../install/hooks/lib/areas.mjs). Política compartilhada, parser por shell — se a política morasse duplicada, divergiria.

O lado PowerShell é mais simples que o de Bash:

- **Não existe `&&`/`||`** em PS 5.1 — só `;`, `|` e newline.
- **A convenção Verbo-Substantivo classifica sozinha**: `Get-`, `Select-`, `Test-`, `Measure-`, `Where-`, `Format-` são leitura por construção. Escrita (`New-Item`, `Set-Content`, `Out-File`) e remoção (`Remove-Item`) ficam em listas explícitas, porque a heurística de verbo erraria — `New-Object` é inerte, `New-Item` escreve.
- **Variáveis literais são resolvidas** (`$root = "E:\…"; … "$root\packages"`). Sem isso todo destino seria indeterminado e o hook recusaria quase tudo. Só literal é expandido; o que vem de comando continua indeterminado.
- **Chamada estática .NET (`[System.IO.Directory]::Delete(…)`) nunca é auto-aprovada** — o verbo do cmdlet não a protege, e ela apaga de verdade.

> ⚠️ **Estado de shell não persiste entre chamadas** (o working directory sim). `$env:X = …` numa chamada e o uso na seguinte = o valor não estava lá. Isso já fez teste rodar contra o banco errado. Ver [`./command-forms.md`](./command-forms.md).

### Template canônico do playbook

[`../install/hooks/auto-approve-project-bash.js`](../install/hooks/auto-approve-project-bash.js) é o template canônico. Parametrizado por `PROJETO` / `SCRATCH` / `LEITURA` (ajustados na instalação, guiados pela medição do passo 1). Use-o como base pra novos hooks.

> **Renomeado.** Chamava-se `auto-approve-worktree-bash.js`, e o nome foi parte do problema: prometia menos do que precisava fazer, e por isso ninguém notou que o root do projeto — a maioria das chamadas — estava descoberto. Ao migrar, **remova o registro antigo de `settings.json`**, senão os dois hooks rodam.

### Customizar: onde mexer para cada coisa

O hook é feito para ser editado — a whitelist envelhece junto com o projeto. O mapa:

| Quero… | Mexa em | Onde exatamente |
|---|---|---|
| Liberar mais um comando de build/test (`vite`, `drizzle-kit`, CLI própria) | `lib/areas.mjs` | `HEADS_PROJETO` — só o **basename** (`node_modules/.bin/x` já casa) |
| Liberar um comando de leitura em **todas** as áreas, inclusive irmãos | `lib/areas.mjs` | `HEADS_LEITURA` |
| Ler um projeto irmão novo | `lib/areas.mjs` | `LEITURA` — path absoluto, lowercase. **Nunca dá escrita** |
| Marcar uma área descartável (escrita e `rm` livres) | `lib/areas.mjs` | `SCRATCH` |
| Restringir um comando por argumento (espelhar rule limitada) | `lib/areas.mjs` | `CHECAGENS_DE_ARGUMENTO` — devolver `false` defere |
| Liberar/segurar um cmdlet PowerShell | `auto-approve-project-powershell.mjs` | `INERTES`, `ESCRITA`, `REMOCAO`; verbo de leitura já passa por construção |
| Um parâmetro PS está comendo o path seguinte | `auto-approve-project-powershell.mjs` | `SWITCHES` — parâmetro que não leva valor |
| Proibir algo de vez | `.claude/settings.json` | `permissions.deny` — não adianta tirar do whitelist |

**Depois de qualquer edição, rode `hook-test.mjs` e `hook-test-powershell.mjs`.** Os casos negativos são o que impede o hook de virar um `allow *` acidental; é barato e pega erro de dedo em regex.

**O que não editar sem medir:** as funções de parser (`segmentos`, `substituicoes`, `aninhados`, `canon`). Se um comando legítimo está sendo recusado, rode `hook-replay.mjs --porques` primeiro — na maioria das vezes a resposta é acrescentar um head ou uma área, não mexer no parser. Quando **for** o parser, adicione o caso ao teste antes de corrigir.

**Se o hook sumir ou quebrar, nada trava** — ele só deixa de aprovar, e todo comando volta a cair no permission system normal. O custo de um bug aqui é fricção, não bloqueio.

### Vantagens descobertas em uso

- **Hot-reload:** hooks recarregam sem precisar de reload window (diferente de rules — confirmado empiricamente).
- **Manutenção:** editar 1 whitelist em JS é mais legível que editar 8×N entradas JSON.
- **Cobertura:** uma regex no JS cobre todas as variantes de quoting/casing/separator que rules exigiriam enumerar.
- **Lógica composicional:** hook pode checar múltiplas condições (path + whitelist de comandos + sem operators perigosos), coisa que pattern matching de rule não faz.

### Cuidados

- **Hooks não bypassam regra `deny` explícita.** Se houver rule de deny matching o comando, hook approve não vence. É exatamente por isso que a lista de "nunca" mora em `deny` (ver acima).
- **Validar a chain inteira não é opcional.** Versões anteriores deste template faziam `split(/&&/)` e validavam só os segmentos de `&&` — então `git status; rm -rf ~` era **auto-aprovado** olhando apenas o head `git`. Brecha de segurança, não de conveniência. O template atual divide em `&&`, `||`, `;`, `|` e newline.
- **O split precisa respeitar aspas e `$( )`.** Split ingênuo pica `grep -E "a|b"` e `X=$(a | b)` ao meio e gera recusa silenciosa de comando legítimo.
- **Substituição de comando executa.** `echo "$(curl evil)"` tem head `echo`, mas o `$( )` roda — valide o conteúdo recursivamente. Aspas simples são exceção: ali nada expande.
- **Canonicalize path antes de comparar.** Match por substring aceita `cd <projeto>/../../evil` como "dentro do projeto". Resolva `..` e normalize as formas do SO (`/e/x`, `//e/x`, `e:\x` → `e:/x`) antes de decidir.
- **Valide destino de escrita, não só o head.** `cp`, `mv`, `mkdir`, `touch`, `sed -i` e alvos de `>`/`>>` precisam cair numa área onde escrever é permitido — senão `cp x ~/.claude/settings.json` passa só porque o head é `cp`.
- **Sem prova de onde está, não aprove.** O payload do `PreToolUse` traz `cwd`; se não vier e não houver `cd` explícito, falhe pro lado seguro.
- **Não duplicar lógica do permission system.** Hook é pra casos onde rule não consegue expressar; pra approve simples (`Bash(git *)` etc), rule continua certa.
