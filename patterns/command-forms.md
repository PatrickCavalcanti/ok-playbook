# Command Forms — a forma canônica de cada ação

> **Escopo:** project-agnostic. Curto de propósito — uma lista que ninguém lê não muda comportamento. Se crescer além de uma tela, quebre em duas.

Quase toda ação tem cinco formas de ser escrita, e o agente escolhe livremente a cada chamada. Isso é o que torna o controle de permissão impossível de acertar por regra: não existe allowlist que cubra todas as variações de um comando que muda de forma a cada vez.

**A saída não é perseguir cada variante — é reduzir as formas.** Uma forma canônica por ação: previsível para quem lê, verificável por hook, e estável entre sessões.

**Regra:** use a forma da coluna "faça". A coluna "evite" não é proibida — é a que **custa um prompt** e às vezes um bug. Se a forma canônica não serve para o seu caso, use outra e siga; não force a canônica onde ela não cabe.

---

## Onde rodar

| Ação | ✅ Faça | ❌ Evite | Por quê |
|---|---|---|---|
| Rodar algo no projeto | `npm test` (direto) | `cd <projeto> && npm test` | O cwd persiste entre chamadas. O `cd` é a causa nº 1 de prompt: o matcher trata `cd` como context-changing e `Bash(npm *)` deixa de casar (**~70%** das chamadas, medido) |
| Rodar em outro diretório | `cd <path>` **uma vez**, em chamada própria | `cd <path> && <cmd>` em toda chamada | Uma mudança de diretório vale para as próximas chamadas |
| Git em outro repo/worktree | `git -C <path> status` | `cd <path> && git status` | `-C` não tem o problema do `cd`, e não deixa o cwd em drift |
| Path em variável | `cd e:/proj/.worktrees/x` (literal) | `cd "$WT"` | Destino não provável não é auto-aprovável — o hook não tem como saber para onde vai |

## Ler e escrever arquivo

| Ação | ✅ Faça | ❌ Evite | Por quê |
|---|---|---|---|
| Ler arquivo | tool **Read** | `cat`, `Get-Content` | Read é a ferramenta certa; sai do fluxo de permissão de shell |
| Procurar em arquivos | tool **Grep** | `grep -rn`, `Select-String` | Idem, e o resultado já vem estruturado |
| Editar arquivo | tool **Edit**/**Write** | `sed -i`, `echo >`, `Set-Content` | Edição por shell não mostra diff e é validada como escrita |
| Arquivo temporário | escrever em `/tmp` ou no scratchpad da sessão | criar `tmp.js` na raiz do projeto | Área descartável é livre; a raiz do projeto suja o working tree |

## Shell

| Ação | ✅ Faça | ❌ Evite | Por quê |
|---|---|---|---|
| Escolher o shell | **um** por tarefa (Bash **ou** PowerShell) | alternar no meio | Cada um tem sintaxe e política próprias; alternar dobra a superfície |
| Env var para um comando | `DATABASE_URL=x node --test …` (mesma chamada) | `export X=…` numa chamada, uso na seguinte | **Estado de shell não persiste entre chamadas** — variáveis e `$env:` somem. O working directory persiste; o resto não |
| Idem em PowerShell | `$env:X = "…"; node --test …` (mesma linha) | atribuir numa chamada, usar em outra | Mesmo motivo — e aqui já causou teste rodar contra o banco errado |
| Parse de log/JSON | script em `/tmp/x.py` + `python /tmp/x.py` | `python -c "…; …"` inline | O matcher quebra a string em `;` `\|` `&&` **sem respeitar aspas**: o inline vira fragmentos (`do`, `print(…)`) que não casam regra nenhuma |
| Mensagem de commit multi-linha | `git commit -F- <<'EOF'` | here-string de PowerShell no Bash tool | O Bash tool é POSIX sh; `@'…'@` mangla a mensagem |
| Rodar binário local | `node_modules/.bin/<bin>` | `pnpm exec <bin>` | `pnpm exec` quebra em worktree (dispara verificação de deps) |

## Worktree e destrutivo

| Ação | ✅ Faça | ❌ Evite | Por quê |
|---|---|---|---|
| Remover worktree | `git worktree remove <path>` | `rm -rf .worktrees/x` | `rm -rf` deixa referência dangling e, com junction, **segue o link e apaga o `node_modules` da main** |
| Apagar coisa | dentro da worktree ou do scratch | no root do projeto | Worktree e scratch são descartáveis; o root é o checkout de verdade e pede confirmação |
| Trocar de branch | dentro de uma worktree | no checkout raiz | Mover o root quebra sessões paralelas que dependem dele estável |

## Projeto irmão

| Ação | ✅ Faça | ❌ Evite | Por quê |
|---|---|---|---|
| Entender o projeto irmão | ler à vontade (ele tem os próprios docs e convenções) | — | Leitura é livre por política |
| Mudar algo lá | escrever **uma** spec/plano completo lá e executar numa **sessão de lá** | editar arquivo por arquivo daqui | Cada projeto sob as próprias regras; a escrita única pede permissão e o prompt vira checkpoint |

---

## Como isso se mantém vivo

1. **Prompt repetido por forma não-canônica é feedback**, não fatalidade. Quando o mesmo comando trava duas vezes, decida: a forma canônica cobre o caso? Então use-a. Não cobre? Então **a lista está incompleta** — acrescente a forma aqui.
2. **Não vire allowlist.** Só entra aqui a ação que tem uma forma claramente melhor. Se as duas formas são igualmente boas, não há o que canonizar.
3. **Reforço por memória.** Correção que o usuário fez sobre *como* fazer algo vira memória `feedback` com **Why** e **How to apply**, apontando para a linha correspondente daqui.
4. **`permissions-review` cruza os dois.** Ao processar prompts repetidos, ele separa "faltou regra" de "usei a forma errada" — o segundo caso vira entrada nesta tabela, não no allowlist.

---

## Composição

- [`permissions.md`](./permissions.md) — por que rules não bastam, hooks, `deny`, as quatro áreas.
- [`subagent-dispatch.md §6.3`](./subagent-dispatch.md) — o prompt do subagente precisa ensinar a forma canônica, senão cada task despachada reproduz a fricção.
- [`worktree.md`](./worktree.md) — política por área e cleanup.
