# Git — Convenções e Bloqueios

> **Escopo:** project-level. Vai parcialmente em `CLAUDE.md` do projeto (via `install/claude-md-snippet.md` apontando pra aqui) e a parte BLOQUEADO se aplica em todos os perfis.

Padrão git compartilhado entre projetos que adotam o ok-playbook. Válido em qualquer perfil (`dev-early`, `dev-stable`, `review` — ver [`profiles.md`](./profiles.md)).

---

## Convenção de Branches

```
feature/<descricao>     → nova funcionalidade
fix/<descricao>         → correção de bug
refactor/<descricao>    → refatoração sem mudança de comportamento
chore/<descricao>       → manutenção, deps, config
experiment/<descricao>  → experimento, pode ser descartado
```

---

## Convenção de Commits

Formato: `type(scope): descrição em inglês`

Tipos válidos: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`

Exemplos:
- `feat(api): add rate limiting`
- `fix(auth): handle expired tokens`
- `chore(root): bump lockfile`

Commits devem ser **atômicos** — uma mudança lógica por commit.

---

## Solicitação de Merge

Quando uma branch estiver pronta, NÃO executar o merge.
Escrever a seguinte mensagem e aguardar aprovação:

```
🔀 PRONTO PARA MERGE
Branch: <nome-da-branch>
Worktree: <path, se aplicável>

Resumo:
- <o que foi feito>

Arquivos alterados: X
Commits: X
Risco estimado: baixo | médio | alto
Motivo do risco: <se médio ou alto>

Aguardando aprovação para merge em main.
```

---

## BLOQUEADO — Nunca executar em nenhum perfil

- `git push --force` ou `--force-with-lease` em qualquer branch
- `git reset --hard` em qualquer branch
- `git push origin --delete <branch>` — deletar branch remota
- `git branch -D <branch>` — deletar branch local forçado
