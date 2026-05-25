# Profiles — Modos de Operação da Sessão

> **Escopo:** project-level. Consumido pelo `CLAUDE.md` do projeto (via bloco "Antes de começar" do `install/claude-md-snippet.md`).

Um **perfil** é um modo de operação que altera os limites de autonomia da sessão: quando confirmar antes de agir, quanto explicar, o que é livre vs bloqueado. Faz sentido porque a mesma pessoa em fases diferentes do projeto precisa de comportamentos diferentes do agente — forçar uma resposta no boot é mais barato que descobrir no meio da sessão que o agente está conservador demais ou liberal demais.

---

## Como escolher

No boot da sessão, o `CLAUDE.md` pergunta "qual o modo desta sessão?" com as 3 opções e default = `dev-early`. A resposta vale para toda a sessão. Mudar de perfil = informar explicitamente.

---

## Perfis canônicos

### dev-early

> Desenvolvimento inicial — projeto em construção, iteração rápida.

#### Comportamento Geral

- Executar planos de ação longos **sem pedir confirmação a cada etapa**
- Não interromper para perguntas sobre decisões técnicas óbvias
- Preferir ação sobre explicação — fazer primeiro, resumir depois
- Commits frequentes e atômicos sem aguardar aprovação
- Se travar em algo, tentar duas abordagens antes de perguntar

#### Git — Permitido sem confirmação

- Qualquer operação em branches que não sejam `main`/`master`
- Criar branches, worktrees, commits, push em branches de trabalho
- Rebase, stash, cherry-pick em branches de trabalho

#### Git — Parar e solicitar

- Merge ou push para `main`/`master` → usar formato de solicitação do `git-rules.md`

#### Git — Nunca executar

Ver [`git.md`](./git.md) seção BLOQUEADO.

#### Instalação de Dependências

- Instalar, remover e atualizar dependências sem confirmação
- Nunca instalar na raiz do monorepo sem avisar

#### Arquivos

- Criar, editar e deletar arquivos dentro do escopo da tarefa sem confirmar
- Avisar antes de deletar diretórios inteiros

#### Comunicação

- Resumos curtos ao final de cada bloco de trabalho
- Sem explicações longas de cada decisão — só o essencial
- Erros de TypeScript devem ser resolvidos, não ignorados

---

### dev-stable

> Desenvolvimento intermediário — funcionalidade amadurecendo, mais cuidado em mudanças estruturais.

#### Comportamento Geral

- Executar tarefas claras sem confirmação
- **Pausar e confirmar** antes de mudanças estruturais (renomear pacotes, alterar exports públicos, mudar schemas)
- Explicar brevemente decisões não óbvias antes de executar
- Perguntar quando houver duas abordagens válidas com trade-offs diferentes

#### Git — Permitido sem confirmação

- Commits, push em branches de trabalho
- Criar branches e worktrees
- Stash, fetch, pull

#### Git — Confirmar antes

- Rebase interativo
- Qualquer operação que reescreva histórico da branch atual

#### Git — Parar e solicitar

- Merge ou push para `main`/`master` → usar formato de solicitação do `git-rules.md`

#### Git — Nunca executar

Ver [`git.md`](./git.md) seção BLOQUEADO.

#### Instalação de Dependências

- Instalar dependências novas: informar o que vai instalar e por quê antes de executar
- Remover dependências: confirmar antes

#### Arquivos

- Criar e editar sem confirmação
- Deletar arquivos: informar antes
- Deletar diretórios: sempre confirmar

#### Comunicação

- Resumo ao final de cada tarefa com o que foi feito e o que pode precisar de atenção
- Sinalizar claramente quando uma decisão técnica pode ter impacto em outros módulos

---

### review

> Revisão e preparação para merge — modo conservador, análise antes de ação.

#### Comportamento Geral

- **Analisar antes de executar** qualquer coisa
- Não fazer alterações de código sem solicitação explícita
- Foco em leitura, análise de risco e geração de relatórios
- Sugerir, não aplicar

#### Git — Permitido sem confirmação

- `git status`, `git log`, `git diff`, `git show`
- `git fetch`

#### Git — Sempre confirmar

- Qualquer commit
- Qualquer push
- Qualquer alteração de branch

#### Git — Parar e solicitar

- Merge ou push para `main`/`master` → gerar relatório de risco antes de solicitar

#### Git — Nunca executar

Ver [`git.md`](./git.md) seção BLOQUEADO.

#### Relatório de Risco de Merge

Quando solicitado a avaliar um merge, gerar:

```
## Relatório de Merge — <branch> → main

### Resumo
- Arquivos alterados: X
- Commits: X
- Autor(es): X

### Mudanças por categoria
- Novos arquivos: ...
- Arquivos modificados: ...
- Arquivos removidos: ...

### Pontos de atenção
- [ ] item 1
- [ ] item 2

### Risco estimado
[ ] Baixo — mudanças isoladas, sem impacto em outros módulos
[ ] Médio — mudanças em interfaces compartilhadas
[ ] Alto — mudanças estruturais, schemas, exports públicos

### Recomendação
...
```

#### Comunicação

- Respostas detalhadas e explicativas
- Sempre apresentar alternativas quando houver risco
- Nunca assumir que algo é seguro sem verificar

---

## Estrutura de cópia

Cada perfil é um arquivo separado em `.claude/profiles/<nome>.md`, copiado pelo processo de instalação (INSTALL §3). O `CLAUDE.md` do projeto apenas referencia — não inline — o conteúdo dos perfis.

---

## Extensibilidade

Projetos podem criar perfis adicionais (`pair`, `ops`, etc.). Mantenha o vocabulário canônico em todas as listas git: **permitido sem confirmação / confirmar antes / parar e solicitar / nunca executar**. Justificativa: o vocabulário comum permite que skills do playbook (e.g. agentes) façam afirmações como "esta operação requer um perfil que permita modificar exports públicos" sem enumerar perfis específicos.
