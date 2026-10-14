# Visão geral — o que o ok-playbook muda no seu projeto

> **Para quem vai usar**, não para quem mantém o playbook. Resume, em uma
> leitura, o que passa a existir no projeto e como o agente passa a se
> comportar. Cada item aponta para o pattern que tem a regra completa — este
> documento não repete regra, só a apresenta.
>
> A skill `ok-playbook` mostra este resumo antes de configurar um projeto, e é a
> ele que ela recorre quando alguém pergunta "o que o ok-playbook faz?".

---

## 1. O que passa a existir no projeto

| Onde | O que é |
|---|---|
| `CLAUDE.md` / `AGENTS.md` | um bloco `ok-playbook:start … end` com as regras de trabalho; o resto do arquivo não é tocado |
| `<playbook-root>` | cópia local dos patterns e templates — o agente lê daqui, sem precisar da skill instalada |
| `.claude/skills/` + `.agents/skills/` | quatro agentes: `docs-review`, `new-agent`, `permissions-review`, `playbook-contribute` |
| `<superpowers-root>` | specs e planos: `drafts/`, `specs/`, `plans/`, com `done/` para os encerrados |
| `<backlog-root>` | feedback que as sessões e os agentes registram |
| `<pendencias-root>` | o que ficou por fazer sem impedir a entrega |
| `<insights-root>` | observações que viram melhoria depois, e propostas de volta ao playbook |
| `<drafts-root>` | rascunhos de agentes novos |
| `<arch-root>` | `_index.md` da arquitetura do projeto |
| `.claude/hooks/` + `.claude/settings.json` | hooks que aprovam comandos seguros e regras de permissão |
| `ok-playbook.json` | manifesto: versão, caminhos escolhidos e o estado de cada item (para atualizar depois) |

Todos os caminhos são configuráveis no `ok-playbook.json`; num projeto já
configurado esta tabela mostra os caminhos reais dele. Na cópia que vem com a
skill eles aparecem como `<nome-root>`, e os defaults (todos sob `docs/`) estão em
[`docs-structure.md`](./docs-structure.md) §4.

## 2. O que o agente passa a fazer em toda sessão

- **Pergunta o modo de operação** ao abrir: `dev-early` (executa planos longos
  sem pedir confirmação a cada passo), `dev-stable` (confirma antes de mudança
  estrutural) ou `review` (analisa e sugere, não altera código sem pedido). Sem resposta, assume `dev-early`. → [`profiles.md`](./profiles.md)
- **Termina com um sinal de atenção** quando devolve o controle — uma de quatro
  linhas fixas (⏳ nada pendente · ▶ pode testar · ❓ decisão · 📖 leia antes),
  para quem roda várias sessões ver de relance qual precisa dele.
  → [`dev-process.md`](./dev-process.md) §10
- **Registra fricção como feedback**: documentação que enganou, correção sua,
  convenção que não funcionou. O arquivo só nasce no primeiro registro (sessão
  sem fricção não gera nada) e, no fim, o agente oferece rodar o `docs-review`,
  que lê a fila e corrige a documentação. → [`feedback-loop.md`](./feedback-loop.md)
- **Registra pendências** no ato, em vez de deixá-las só na conversa, e procura
  pendências da área antes de mexer nela. → [`dev-process.md`](./dev-process.md) §9
- **Oferece revisar permissões** se o mesmo comando pediu aprovação mais de uma
  vez. → [`permissions.md`](./permissions.md)
- **Salva memória persistente** só do que não está no código nem no git, numa
  tipologia fixa. → [`memory.md`](./memory.md)

## 3. Como o agente conduz o trabalho

- **Quatro fluxos**: ajuste pontual (direto, sem plano), funcionalidade (spec +
  plano com fases até a entrega), processo (script) e correção de bug (reproduz,
  corrige, teste de regressão antes da entrega). Trabalho pequeno com risco sobe
  para o fluxo completo. → [`dev-process.md`](./dev-process.md) §2
- **Spec e plano escritos, em pastas próprias.** O playbook exige que trabalho de
  funcionalidade passe por spec aprovada e plano com fases, e define o que o
  plano contém, onde os arquivos ficam e quando arquivam. **Com que skill isso é
  escrito é escolha sua**: o playbook vem integrado aos skills do
  [superpowers](https://github.com/obra/superpowers) (`brainstorming` →
  `writing-plans` → `subagent-driven-development`) e ajusta o comportamento
  deles (cadência de testes, reviews, modelos), mas outro skill ou método
  próprio serve, desde que produza spec e plano nesse formato.
  → [`superpowers-workflow.md`](./superpowers-workflow.md),
  [`docs-structure.md`](./docs-structure.md) §6, [`dev-process.md`](./dev-process.md) §3
- **Um gate só por plano.** Antes de executar, o agente mostra o plano inteiro —
  fases, o que roda em paralelo, quem faz cada parte — e você aprova uma vez.
  Depois ele executa todas as fases, reportando entre elas, e só para por motivo
  da lista fechada (bloqueio, mudança de spec, ação destrutiva).
- **Quem planejou executa**, como orquestrador: subagentes implementam, o agente
  principal decide e revisa. Review ao fim de cada fase e um **review do conjunto
  no modelo mais forte disponível** como gate da entrega.
  → [`subagent-dispatch.md`](./subagent-dispatch.md)
- **Worktree por plano** — o trabalho acontece num checkout separado e a main
  fica limpa. **Entrega não é merge**: o agente pergunta se você quer mergear ou
  usar na worktree. → [`worktree.md`](./worktree.md), [`git.md`](./git.md)
- **Scripts de processo** para o que é determinístico (abrir worktree, rodar a
  suíte contra uma baseline, banco de teste), cada um terminando numa linha
  `OK` / `SUJO:` / `FALTA:`. O projeto implementa; o playbook fixa o contrato e
  traz um `worktree.mjs` de referência. → [`dev-process.md`](./dev-process.md) §7

## 4. Com um desk de workers (ex.: Nidavellir)

Sem desk, os subagentes são os da própria CLI e o modelo segue o papel:
econômico para levantar, implementar e revisar fase; o mais forte para a revisão
final.

Com um **desk de workers** — um orquestrador que dá à sessão workers de várias
CLIs, com cota legível e disparo (o Nidavellir é um exemplo) — o plano passa a
**distribuir o trabalho entre as CLIs**:

- cada task do plano diz qual worker a implementa e por quê (dificuldade da task
  × capacidade do worker; cota da CLI);
- o que é independente roda em paralelo, de preferência em CLIs diferentes, para
  render a cota de todas;
- o mapa task → worker vai no mesmo gate do plano, e você aprova ou troca;
- o orquestrador faz todos os commits; a revisão final exige o worker mais forte
  disponível, sem rebaixar por economia; decisão de desenho nunca sai do
  orquestrador.

→ [`subagent-dispatch.md`](./subagent-dispatch.md) §4.3

## 5. O que o agente não faz sem você

- **Git destrutivo** (`reset`, `stash`, `clean`, `checkout -- .`, `push --force`)
  — proibido para subagentes; na main, preservar é commitar.
- **Merge na main** — só a pedido.
- **Criar banco de teste** — só com um "sim" a uma pergunta feita só sobre isso;
  teste com banco fica fora do plano por padrão.
- **Publicar** issue ou PR no playbook — só com o seu sim ao texto final.
- **Instalar dependência** — subagente não instala; fica com o agente principal.

→ [`dev-process.md`](./dev-process.md) §5, [`git.md`](./git.md)

## 6. O que mexe na sua máquina

- **Hooks de auto-aprovação** (`.claude/hooks/`, Bash e PowerShell): aprovam sem
  perguntar os comandos de leitura e escrita dentro das áreas conhecidas do
  projeto, e deixam passar para o prompt normal o que é destrutivo fora da
  worktree. Git que mexe no repositório inteiro (`stash drop`, `branch -D`,
  `worktree remove`, `tag -d`) sempre pergunta, inclusive dentro da worktree. As
  áreas do seu projeto (rascunho, projetos irmãos que ele lê, bins próprios) ficam
  em `.claude/hooks/areas.local.json`; os hooks em si ficam iguais ao canon.
- **`.claude/settings.json`**: o `apply` mescla uma vez uma lista de `allow`
  (git, node, npm/pnpm, leitura) e de `deny` (`push --force`, `reset --hard`,
  `clean -f`, instalação global, `publish`). O que você remover depois não volta.
  Vindo de uma versão antiga do playbook, ele também tira `Bash(rm *)`/`Bash(mv *)`
  do `allow` e liga o hook novo no lugar do antigo.

→ [`permissions.md`](./permissions.md), [`command-forms.md`](./command-forms.md),
[`worktree.md`](./worktree.md) §6

## 7. O que dá para recusar

Na configuração, qualquer item pode ficar de fora: `--sem <id>` não o escreve
(ex.: `--sem settings` desliga o merge de permissões; `--sem hook:<arquivo>`
deixa um hook de fora). Uma regra do bloco do `CLAUDE.md` que não sirva ao
projeto se edita no próprio bloco e se registra com `--manter regras:CLAUDE.md`
— vira customização local, e a skill avisa quando o canon mudar nesse ponto.
Detalhe dos modos e flags: `SKILL.md` da skill.
