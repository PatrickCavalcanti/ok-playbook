# Permissions — Permissões do Claude Code

> **Escopo:** project-level. Consumido pelo snippet de permissões (items concretos, mesclados em `.claude/settings.json`) e pelo bloco de regras do playbook (ponteiro filosófico).

Filosofia de configuração de permissões em `.claude/settings.json`. O snippet de permissões da skill entrega os items path-agnostic; este doc explica o porquê e cobre os casos especiais que o snippet não pode resolver automaticamente.

---

## Por que importa

Permissões apertadas demais geram prompts constantes de confirmação — o agente trava em operações previsíveis como `git status` ou `tsc`, quebrando o fluxo. Permissões largas demais criam risco: um subagente em loop pode fazer install global, reescrever configurações do sistema ou bagunçar `~/.claude/` sem aviso. O objetivo é deixar o agente fluir em operações **previsivelmente seguras** (leitura, build, testes) e pausar para confirmar em operações **potencialmente destrutivas** (rede ampla, install global, mexer em configs globais). A distinção não é sobre o comando em si, mas sobre o escopo de impacto que ele pode ter fora do projeto corrente.

---

## Categorias

| Categoria | Exemplos | Resolução |
|---|---|---|
| Path-agnostic | `Bash(git *)`, `Bash(node *)`, `WebSearch` | Entram no snippet, instalam diretos |
| Path-specific | `Bash(cd e:/<projeto>/.worktrees/* && *)` | a skill `ok-playbook` (modo configurar) pergunta o path e gera as variantes |
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

## Rules de arquivo (`Read` / `Edit` / `Write`) — o outro eixo

> ⚠️ **O resto deste doc é sobre shell (Bash/PowerShell), onde o problema é *forma do comando*. Aqui o problema é outro: *âncora de path*. Um pattern de arquivo sintaticamente plausível pode nunca casar com nada, silenciosamente — não há erro, log ou aviso. O sintoma é só o prompt continuar aparecendo.**

### Edição nunca é liberada por "estar dentro do projeto"

A [doc oficial](https://code.claude.com/docs/en/permissions) separa os três tipos:

| Tipo | Aprovação necessária | "Não perguntar de novo" dura |
|---|---|---|
| Leitura (`Read`, `Grep`) | **Não**, dentro do working dir e `additionalDirectories` | — |
| Bash | Sim, exceto read-only builtin | Permanente, por repo + comando |
| **`Edit` / `Write`** | **Sim, sempre** | **Só até o fim da sessão** |

Estar no working directory dá leitura livre, **nunca escrita**. Sem uma allow rule que case, todo edit pede aprovação — e o botão "allow all edits this session" expira ao fechar a sessão. Daí a percepção recorrente de "isso já funcionou antes e voltou a pedir": nunca funcionou por rule, funcionava por sessão.

### Os quatro âncoras de path

| Forma | Significado | Resolve para |
|---|---|---|
| `//path` | **Absoluto**, da raiz do filesystem | `/path` |
| `~/path` | A partir do home | `<home>/path` |
| `/path` | Relativo à **fonte do settings** | project root, ou cwd, ou `~/.claude/` — ver abaixo |
| `path`, `./path` | Relativo ao cwd | `<cwd>/path` |

> A doc é explícita: "A pattern like `/Users/alice/file` isn't an absolute path. The single leading slash anchors at the settings source, not the filesystem root."

**No Windows, paths são normalizados pra POSIX antes do match**: `E:\Projetos\X` vira `/e/Projetos/X`. Portanto a **única** forma absoluta que casa é `//e/Projetos/X/**`.

Todas estas são silenciosamente mortas:

```jsonc
"Edit(e:/Projetos/X/**)"      // relativo ao cwd → <cwd>/e:/Projetos/X/** — não existe
"Edit(e:\\Projetos\\X\\**)"   // idem, com separador que nem sobrevive à normalização
"Edit(/e/Projetos/X/**)"      // relativo à fonte do settings → <project root>/e/Projetos/X/**
"Edit(//E/Projetos/X/**)"     // drive maiúsculo; a normalização produz minúsculo
```

E esta é a que funciona:

```jsonc
"Edit(//e/Projetos/X/**)"
```

**Sintoma diagnóstico:** se `Read` nunca incomoda mas `Edit` sempre pede, não conclua que "leitura está liberada e escrita não" — leitura é livre por padrão no working dir, então uma rule `Read` quebrada **não produz sintoma nenhum**. O allowlist parece funcionar quando na verdade metade dele é decorativo. Confira as rules de `Read` também: se elas não estão na forma `//`, as de `Edit` ao lado provavelmente também não estão.

### Onde a rule mora muda o que ela casa

Para o âncora `/path`, a "fonte do settings" varia:

| Rule definida em | `/path` resolve para |
|---|---|
| `.claude/settings.json` (projeto) | `<project root>/path` |
| `.claude/settings.local.json` | `<cwd original da sessão>/path` |
| `~/.claude/settings.json` (usuário) | `~/.claude/path` |

Duas consequências práticas:

1. **Em sessão de worktree, `settings.local.json` ancora na worktree**, não no root do repo — uma rule `Edit(/src/**)` compartilhada casa o `src/` daquela worktree, que costuma ser o desejado.
2. **Se `settings.local.json` for versionado, a worktree carrega a cópia do commit dela.** Corrigir uma rule na `main` não chega na worktree até commitar e a branch puxar. Por isso rules de path absoluto (`//e/...`) que precisam valer em toda sessão do projeto ficam melhor em `~/.claude/settings.json`: carregam em qualquer cwd, main ou worktree, sem depender de commit.

### A política de áreas não tem metade de arquivo

A tabela de [§Quatro áreas, quatro políticas](#quatro-áreas-quatro-políticas) — worktree descartável, root sem destrutivo, scratch livre, irmãos só-leitura — é implementada **só no hook, e o hook só tem matcher `Bash` e `PowerShell`**. As tools `Edit` e `Write` não passam por ele.

Ou seja: a política existe pra `rm` e não existe pra `Edit`. Fechar essa metade é decisão de projeto, e há duas saídas:

| Saída | Como | Trade-off |
|---|---|---|
| Allow rules de path | `Edit(//<abs>/**)` + `Write(//<abs>/**)` no settings do usuário | Explícito e auditável; exige path absoluto por máquina |
| `defaultMode: "acceptEdits"` | Em `settings.json` | Cobre working dir + `additionalDirectories` sem manter lista de paths. **Mas**: em sessão iniciada pela extensão do VS Code, "the extension resolves the starting mode instead" — o `defaultMode` pode ser ignorado |

Em máquina Windows com VS Code, a allow rule é a via confiável.

> Escrita em **paths protegidos** (`.git/`, `.claude/`) pode continuar pedindo confirmação mesmo sob allow rule — é proteção separada, e é desejável mantê-la.

---

## Casos especiais

### Worktree no Windows: por que rules não bastam

Cada subagente pode formatar o `cd` de forma diferente: com `/d`, com quoting MSYS (`/e/...`) ou Windows (`e:/...` ou `e:\\...`), com letra de drive maiúscula ou minúscula, com/sem aspas. Pra Claude Code, cada combinação é uma permissão distinta — liberar uma não libera as outras.

Versões anteriores deste doc enumeravam 8 variantes de `Bash(cd <path> && *)`. **Essa abordagem não funciona** porque o matcher não expande `*` no inner segment (ver §"Quando rules não bastam"). A variação com inner literal — `Bash(cd <path> && <cmd> *)` — funciona mas explode pra 8 variantes × N comandos = 100+ rules.

**Solução canônica:** PreToolUse hook (`.claude/hooks/auto-approve-project-bash.mjs`) — que cobre o root do projeto tanto quanto a worktree, porque o root é onde estão a maioria das chamadas. Detalhes em [`./worktree.md §6.2`](./worktree.md).

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

**Cuidado adicional em rules de arquivo:** generalizar o path não basta se o âncora estiver errado. A UI salva `Edit(e:\<proj>\src\a.ts)`; trocar o arquivo por `**` produz `Edit(e:\<proj>\src\**)`, que **continua morto** — falta o `//` e a normalização POSIX. A forma correta é `Edit(//e/<proj>/src/**)`. Ver [§Rules de arquivo](#rules-de-arquivo-read--edit--write--o-outro-eixo).

---

## Quando rules não bastam: PreToolUse hooks

> 🎯 **A causa raiz não é cobertura, é variedade de forma.** Toda ação tem cinco formas de ser escrita e o agente escolhe livremente a cada chamada — nenhum allowlist cobre isso. Reduzir as formas ataca a causa; caçar variantes ataca o sintoma. Ver [`./command-forms.md`](./command-forms.md), que é curto de propósito.

> ⚠️ **Antes de ler o resto: MEÇA.** O sintoma "peço permissão o tempo todo mesmo com o allowlist certo" quase nunca é falta de regra — é **formato de comando**. Rode `.claude/hooks/tools/medir-comandos.mjs` antes de editar qualquer allowlist. Sem medir, cada prompt vira uma entrada nova que também não vai casar, e o `settings.local.json` acumula literais gigantes que servem a um comando só.

Rules em `permissions.allow` cobrem a maioria dos casos **quando o comando é simples**. O que **não funciona por rule**:

1. **Comandos compostos com `cd <path> && <cmd>`** — o matcher trata `cd` como context-changing (igual `devbox run`), exigindo regra combinada explícita. Patterns como `Bash(cd <path> && *)` com wildcard inner **não casam**. Patterns `Bash(cd <path> && <cmd> *)` com literal inner funcionam mas explodem pra N variantes de path × M comandos = 100+ rules.

   **Este é o caso dominante, e não é sobre worktree.** Medido em dois projetos independentes: 846/1186 (71%) e 1173/1694 (69%) das chamadas Bash começam com `cd` — e a maioria aponta pro **root do projeto** (648 root × 214 worktree num deles). Um hook que só cobre `.worktrees/` deixa descoberta a maior parte das sessões: a cobertura medida dessa versão foi de **8,7%** a **17,3%** (um número por projeto), com o prompt continuando a aparecer o tempo todo.

2. **Edições em `.claude/settings.json` não recarregam mid-sessão.** Apenas o diálogo "Yes don't ask again" atualiza memória + disco simultaneamente. Toda mudança em rules exige reload window. **Hooks recarregam ao vivo.** Essa assimetria é o que faz um conserto correto parecer que não funcionou — e leva a empilhar mais regras que também não casam. Por isso o conserto mora no hook.

3. **Patterns muito dependentes de string-shape do comando** (quoting, casing, separadores de path) — onde a explosão combinatória vence a tentativa de generalizar. Caso típico: o matcher de `allow` quebra a string em `;` `|` `&&` **sem respeitar aspas**, então um comando composto ou inline (`for … done`, `python -c "…"`, `--format="%ci %s"`) com metacaractere dentro das aspas vira fragmentos que não casam regra alguma e pede permissão **mesmo com o head liberado**. Não dá para allowlistar fragmentos; o conserto é o hook quote-aware (abaixo) e, no comportamento, preferir script limpo a inline (ver [`./command-forms.md`](./command-forms.md)).

### A lista de "nunca" mora em `deny`, não na ausência de `allow`

Não adianta *deixar de listar* `git push --force` esperando que ele peça confirmação: qualquer regra larga (`Bash(git *)`) já o aprova, e o whitelist do hook — que espelha as rules — herda a folga junto. Ausência de allow é derrotada por permissividade em qualquer camada.

`permissions.deny` ganha das duas: **hook não bypassa deny**. É lá que a lista de nunca deve morar.

O meio-termo é `permissions.ask`, avaliado antes do `allow`: o comando continua possível, mas sempre pede confirmação. O snippet usa `ask` para o git que mexe em estado do repositório inteiro (`stash drop|clear|pop`, `branch -D|-M|-f`, `worktree remove|prune|move`, `tag -d`, `update-ref -d`) — o hook já não os aprova, e sem o `ask` o `Bash(git *)` os liberaria.

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
| `<projeto>/.worktrees/…` | Descartável — destrutivo livre (`rm`, `mv`, `git reset --hard`), **exceto** git de estado compartilhado (`stash drop/pop`, `branch -D`, `worktree remove/prune`, `tag -d`), que pede em todo escopo |
| `<projeto>` (root) | Checkout de verdade — **sem destrutivo**, pede confirmação |
| Scratch (`/tmp`, temp do Claude) | Descartável por definição — escrita livre |
| Projetos irmãos | **Só leitura** — escrita sempre pede |

> ⚠️ **Esta tabela vale para shell.** O hook tem matcher `Bash` e `PowerShell`; `Edit` e `Write` não passam por ele e seguem as rules de path — ver [§Rules de arquivo](#rules-de-arquivo-read--edit--write--o-outro-eixo).

A área de leitura não é uma restrição técnica, é um padrão de trabalho: **trabalho que cruza pra um projeto irmão se resolve com um artefato, não com acesso.** Leia à vontade (o irmão tem os próprios `CLAUDE.md`, docs e convenções — dá pra entender o contexto inteiro sem escrever nada), escreva **uma** spec ou plano completo lá, e execute numa sessão aberta dentro daquele projeto, sob as regras dele. A escrita desse único arquivo pede permissão, e o prompt vira checkpoint útil em vez de fricção.

### Roteiro de diagnóstico (5 passos)

As três ferramentas em `.claude/hooks/tools/` derivam o diretório de transcripts do `cwd` e o hook do próprio path — rodam em qualquer projeto sem edição.

```bash
# 1. MEDIR ANTES. Mostra o % com `cd`, pra onde apontam, e os heads reais.
node .claude/hooks/tools/medir-comandos.mjs

# 2. Cobertura da versão atual do hook (baseline).
node .claude/hooks/tools/hook-replay.mjs

# 3. Portar o hook; declarar scratch, leitura e headsProjeto em
#    .claude/hooks/areas.local.json com o que o passo 1 mostrou
#    (não edite lib/areas.mjs).

# 4. Suite de casos — os NEGATIVOS são o que importa.
node .claude/hooks/tools/hook-test.mjs

# 5. Cobertura depois + o que sobrou e por quê.
node .claude/hooks/tools/hook-replay.mjs --porques
```

No passo 5, separe **recusa legítima** (comando fora das áreas, destrutivo no root, escrita em projeto irmão, `cd "$VAR"` cujo destino não dá pra provar) de **falso negativo do parser** (formato que o hook não entendeu). Só o segundo grupo justifica mexer no código. Referência de cobertura alcançada: **95%** e **87%** nos dois projetos medidos — o resto era recusa legítima.

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

Em máquina Windows a tool PowerShell não é detalhe: medido num projeto, **376 chamadas = 17,1% de todo o shell**, e **56% começam com `Set-Location`/`cd`**. Pior, 39 começam com atribuição (`$x = (Select-String …)`), que esconde o cmdlet do matcher — `PowerShell(Select-String *)` nunca casa. Sem hook, praticamente toda chamada PowerShell pede permissão.

O template traz **dois hooks** (`auto-approve-project-bash.mjs` e `auto-approve-project-powershell.mjs`) sobre **uma política única** em `.claude/hooks/lib/areas.mjs`. Política compartilhada, parser por shell — se a política morasse duplicada, divergiria.

O lado PowerShell é mais simples que o de Bash:

- **Não existe `&&`/`||`** em PS 5.1 — só `;`, `|` e newline.
- **A convenção Verbo-Substantivo classifica sozinha**: `Get-`, `Select-`, `Test-`, `Measure-`, `Where-`, `Format-` são leitura por construção. Escrita (`New-Item`, `Set-Content`, `Out-File`) e remoção (`Remove-Item`) ficam em listas explícitas, porque a heurística de verbo erraria — `New-Object` é inerte, `New-Item` escreve.
- **Variáveis literais são resolvidas** (`$root = "E:\…"; … "$root\packages"`). Sem isso todo destino seria indeterminado e o hook recusaria quase tudo. Só literal é expandido; o que vem de comando continua indeterminado.
- **Chamada estática .NET (`[System.IO.Directory]::Delete(…)`) nunca é auto-aprovada** — o verbo do cmdlet não a protege, e ela apaga de verdade.

> ⚠️ **Estado de shell não persiste entre chamadas** (o working directory sim). `$env:X = …` numa chamada e o uso na seguinte = o valor não estava lá. Isso já fez teste rodar contra o banco errado. Ver [`./command-forms.md`](./command-forms.md).

### Template canônico do playbook

`.claude/hooks/auto-approve-project-bash.mjs` é o template canônico. `PROJETO` é calculado em tempo de execução; `scratch` / `leitura` / `headsProjeto` vão no `areas.local.json` do projeto, guiados pela medição do passo 1. Use-o como base pra novos hooks.

> **Renomeado.** Chamava-se `auto-approve-worktree-bash.js`, e o nome foi parte do problema: prometia menos do que precisava fazer, e por isso ninguém notou que o root do projeto — a maioria das chamadas — estava descoberto. Ao migrar, **remova o registro antigo de `settings.json`**, senão os dois hooks rodam.

### Customizar: onde mexer para cada coisa

A whitelist envelhece junto com o projeto, mas **o que é do projeto não se edita no `lib/areas.mjs`**: ele fica idêntico ao canon (edição local vira `customizado` e trava a atualização). A configuração do projeto mora em `.claude/hooks/areas.local.json`, opcional, lido a cada execução:

```json
{ "scratch": ["c:/scratch"], "leitura": ["e:/projetos/irmao"], "headsProjeto": ["drizzle-kit"] }
```

Todas as chaves são arrays de strings, opcionais, e **somam** aos defaults. Paths absolutos (o hook canonicaliza). JSON ausente ou inválido = só os defaults — o hook nunca quebra por causa dele, só aprova menos; com `OK_HOOK_DEBUG=1` o stderr diz por que foi ignorado. O mapa:

| Quero… | Mexa em | Onde exatamente |
|---|---|---|
| Liberar mais um comando de build/test (`vite`, `drizzle-kit`, CLI própria) | `areas.local.json` | `headsProjeto` — só o **basename** (`node_modules/.bin/x` já casa) |
| Liberar um comando de leitura em **todas** as áreas, inclusive irmãos | `lib/areas.mjs` | `HEADS_LEITURA` (mudança de canon — proponha ao playbook) |
| Ler um projeto irmão novo | `areas.local.json` | `leitura` — path absoluto. **Nunca dá escrita** |
| Marcar uma área descartável (escrita e `rm` livres) | `areas.local.json` | `scratch` |
| Restringir um comando por argumento (espelhar rule limitada) | `lib/areas.mjs` | `CHECAGENS_DE_ARGUMENTO` — devolver `false` defere (mudança de canon) |
| Liberar/segurar um cmdlet PowerShell | `auto-approve-project-powershell.mjs` | `INERTES`, `ESCRITA`, `REMOCAO`; verbo de leitura já passa por construção (mudança de canon — proponha ao playbook; editar no projeto vira `customizado`) |
| Um parâmetro PS está comendo o path seguinte | `auto-approve-project-powershell.mjs` | `SWITCHES` — parâmetro que não leva valor (mudança de canon) |
| Fazer um comando sempre pedir confirmação, mesmo com rule larga no allow | `.claude/settings.json` | `permissions.ask` — vem antes do `allow` |
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

---

## Anexo: prompt de auditoria de rules de arquivo

Cole numa sessão aberta **dentro do projeto a corrigir**. Project-agnostic — descobre os paths sozinho.

````text
Audite as permission rules de ARQUIVO (Read/Edit/Write) deste projeto. Contexto:
descobrimos que patterns de path com âncora errado morrem silenciosamente — não há
erro nem log, o único sintoma é o prompt de aprovação continuar aparecendo.

1. LEIA a doc oficial antes de concluir qualquer coisa — não vá de memória:
   https://code.claude.com/docs/en/permissions
   Confirme lá: (a) a tabela de quais tools exigem aprovação; (b) a tabela de
   âncoras de path (`//abs`, `~/home`, `/fonte-do-settings`, `relativo ao cwd`);
   (c) a normalização de path no Windows.

2. LEIA os três settings que se aplicam a este projeto:
   .claude/settings.json, .claude/settings.local.json, e o settings do usuário
   (~/.claude/settings.json ou %USERPROFILE%\.claude\settings.json).

3. CLASSIFIQUE cada rule de Read/Edit/Write como VIVA ou MORTA, mostrando para
   onde cada pattern morto resolve de fato. Suspeitos típicos no Windows:
   `X(c:/...)`, `X(c:\\...)`, `X(/c/...)` e drive maiúsculo — todos mortos.
   A única forma absoluta que casa é `//c/...` com drive minúsculo.
   Atenção: rules `Read` mortas não produzem sintoma (leitura já é livre no
   working dir), então não use "leitura funciona" como prova de que estão certas.

4. VERIFIQUE se existe alguma allow rule de Edit/Write cobrindo o código do
   projeto. Se não existir, todo edit pede aprovação a cada sessão — é o default,
   não um bug de configuração.

5. PROPONHA o diff antes de aplicar, respondendo:
   - quais rules mortas remover ou converter para a forma `//`;
   - se a cobertura de Edit/Write deve ser o projeto inteiro ou só subdiretórios;
   - em qual arquivo cada rule deve morar. Lembre que `settings.local.json`
     versionado viaja para worktrees pelo commit, enquanto o settings do usuário
     vale em qualquer cwd imediatamente.

6. Depois de aplicar, VALIDE o JSON de cada arquivo tocado e avise que rules não
   recarregam mid-sessão — precisa de reload window para entrar em vigor.

Não invente sintaxe: se a doc não confirmar uma forma, diga que não confirmou.
````
