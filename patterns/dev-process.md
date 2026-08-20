# Dev Process — fluxo de trabalho por tipo de solicitação

> **Padrão de processo, project-agnostic.** Define como uma sessão de agente
> conduz trabalho de desenvolvimento: os quatro fluxos por tipo de solicitação,
> o que o plano contém, quando testes e reviews rodam, o contrato dos scripts de
> processo, e como a entrega volta para o usuário. Complementa
> [`superpowers-workflow.md`](./superpowers-workflow.md) (skills e modelos) e
> [`subagent-dispatch.md`](./subagent-dispatch.md) (como despachar).
>
> **Quando este documento entrar em conflito com a prática, a prática vence —
> atualize o documento.**
>
> **Origem:** destilado de um dossiê de 7 execuções reais (≈134 erros de plano
> catalogados) mais uma rodada de 4 sessões operando o processo — cada regra
> carrega o caso que a paga. Primeira instalação: projeto Igris, 2026-08.

---

## 1. Princípio raiz

> **Procedimento determinístico é script. A LLM não executa procedimento.**
> Quando o processo está quebrado, consertar o processo vem *antes* do trabalho —
> e o conserto não compartilha contexto com a funcionalidade.

Onde a sessão descobriria, montaria e depuraria uma sequência de comandos, o
projeto expõe **um script**, e a sessão chama o verbo. Script não é lido pela
metade nem interpretado errado. Medido: a saída de um runner de teste **não
distingue** "seu código quebrou" de "você invocou errado" de "isto já estava
quebrado" — e a sessão gasta o tempo do dono investigando o que não é dela.

---

## 2. Quatro fluxos por tipo de solicitação

| Fluxo | Quando | Forma |
|---|---|---|
| **Ajuste pontual** | usuário está usando e quer mudar algo | sem plano, direto, onde ele está testando (main ou worktree do momento) |
| **Funcionalidade** | trabalho novo, várias frentes | plano com fases, até a entrega |
| **Processo** | criar ou consertar script | sempre em sessão separada — entregar o prompt, não consertar inline |
| **Correção de bug** | comportamento errado medível antes/depois | reproduz → corrige → teste de regressão **antes** da entrega (único fluxo com teste antes da entrega) |

**Gatilho de risco** — escala trabalho pequeno para o fluxo completo se qualquer
resposta for ruim (duas perguntas de propósito: lista longa é aplicada pela
metade — medido em cinco casos onde a regra violada estava *lida*):

1. *Se eu errar aqui, o erro se desfaz sozinho?* Usuário normal desfaz pelo
   app = leve; precisa de acesso a banco/disco = pesado. Sinal de alerta:
   gravar **estado durável** a partir de condição calculada nesta requisição.
2. *O efeito aparece fora do que estou mudando?* Outra camada, outro consumidor,
   ferramenta externa.

---

## 3. A escrita do plano

1. **O planejador abre o que o plano toca.** O preditor mais forte do dossiê:
   erro de costura mora exatamente na fronteira do que **não foi lido** — abrir o
   arquivo derruba a costura de ~65% para 20–33% dos erros, e não protege contra
   lógica (por isso os reviews existem). Task que remenda arquivo existente exige
   o arquivo lido **nesta sessão**.
2. **Escopo que depende de dado real se mede no dado** (consultas de leitura,
   logs), não se deduz do schema. Num caso, 4 consultas eliminaram uma fase
   inteira do plano.
3. **Regras de conteúdo** — cada uma trava uma forma de defeito crítico
   recorrente:
   - duas partes derivam a mesma grandeza → o plano **nomeia a fonte única**;
   - step muda função compartilhada ou contrato de saída → **enumera
     chamadores/consumidores** (um grep no momento do plano) e decide cada um;
   - migração destrutiva **converte os ponteiros antes de destruir**; a guarda
     testa o estado que a migração muda, nunca a existência do que ela apaga;
   - "fora de escopo" **registra a premissa** que o sustenta — o plano que a
     derruba herda o escopo;
   - step que **remove** arquivo/componente enumera quem ainda o importa e
     remove na mesma unidade de commit; a varredura inclui o nome **em prosa** e
     o texto que chega ao usuário, não só o identificador.
4. **Contexto obrigatório enxuto: a spec e os arquivos tocados.** Mandato de
   leitura de docs falha em silêncio (docs "citados no plano e não abertos",
   medido duas vezes). Armadilha operacional entra **no step onde morde**.
5. **Ferramenta externa de CLI se prova executando** (comando + efeito
   observado), nunca lendo — o defeito mais grave do dossiê era um caractere de
   semântica de CLI sem nenhum arquivo para abrir.
6. O plano chega à worktree **commitado** (untracked não atravessa; o
   implementer improvisa). Steps com código concreto; a verificação vive no
   prompt de dispatch (§5), não em anotações.

---

## 4. Execução

```
  gate de pré-requisito ...... roda os scripts de processo que existem
        ↓                      falta algo → prompt para sessão separada (§7)
  worktree via script
        ↓
  ┌── fase ────────────────────────────────────────────────┐
  │  task → commit   (dispatch com passo zero, §5)          │
  │        ↓                                                │
  │  testes do que ESTA fase escreveu ....... direto        │
  │        ↓                                                │
  │  review de fase ......................... papel: revisão │
  └─────────────────────────────────────────────────────────┘
        ↓
  review do conjunto ......................... papel: revisão forte
        ↓
  ▶ ENTREGA — report + pergunta: merge, ou usar na worktree? (§8)
        ↓
  suíte global, regressão, banco, endurecimento ... quando o usuário pedir
```

- **Entrega é no fim do plano.** Parada intermediária só se acordada no gate,
  antes do primeiro dispatch. Nunca perguntar "quer testar?" entre fases — nem
  na forma disfarçada ("a menos que você queira olhar antes").
- **Teste do que a fase escreveu:** direto, comando simples. **Suíte global:**
  só via script com verde de referência (§7) — sem o script, não roda, e diz
  isso no report. **"Suíte verde" nunca é declaração de validação** (medido:
  suíte inteira verde pelo caminho degradado, duas vezes).
- **Teste com banco: fora do plano por padrão.** Só quando banco é o assunto E
  há script de preparação validado.
- **TDD não é obrigatório.** Teste profundo paga onde a **lógica é pura**;
  interação de usuário e comportamento de biblioteca externa têm o usuário como
  oráculo — regressão ali nasce do que ele reportar. Teste antes da entrega: só
  no fluxo de bug.
- **Reviews por papel** (mapeamento de modelos em
  [`superpowers-workflow.md`](./superpowers-workflow.md)): fim de cada fase
  (revisão de fase, agentes separados) + **conjunto final (revisão forte)** —
  este achou o defeito crítico em 7 de 7 execuções medidas e é **gate da
  entrega**, confirmado por escrito no report: (a) rodou no papel forte; (b)
  re-rodou **depois** das correções; (c) com a worktree atualizada contra a
  base. O prompt do review do conjunto é **dirigido** — nomeia a caça:
  1. uma camada decide, a seguinte desfaz sem saber;
  2. dois caminhos derivam a mesma grandeza de fontes diferentes (e o avesso:
     uma fonte respondendo duas perguntas, só uma podia persistir);
  3. um bug esconde o outro;
  4. o passo anterior destrói o insumo do passo seguinte;
  5. a frase do step contradiz o código do mesmo step;
  6. contrato de saída mudou e quem consome não sabe (varrer o repositório
     atrás de consumidores, não só o diff);
  7. "fora de escopo" apoiado em premissa que este plano derrubou;
  8. **composição** — dois achados defensáveis isolados que juntos descrevem um
     caminho completo ("o que estes achados fazem juntos?").
- **Correção de achado enumera os irmãos**: o review nomeia um sintoma; quem
  corrige lista tudo que deriva da mesma fonte e decide caso a caso.
- **Falha sem relação com o diff:** registrar 1 linha, dizer que não é sua, o
  usuário decide. Nunca investigar por conta (a atribuição é fato via baseline,
  §7 — não julgamento).
- **Bug visto durante o uso:** registrar em pendência (§9), não corrigir com
  plano na hora. Bug durante a implementação inicial é ruído.

---

## 5. Prompt de dispatch (todo subagente)

1. **Passo zero de premissas**: lista de símbolos/assinaturas/textos que o step
   assume, com "se divergir, PARE e devolva BLOCKED — não adapte". Zerou erro de
   costura em 5 execuções, a custo de minutos.
2. **Pergunta de julgamento no fim (obrigatória)**: sobre o que o implementer
   acabou de construir ("essa guarda pode recusar caso legítimo?"). Numa
   execução, 5 achados vieram **só** dela — nenhum de review.
3. **Exceção autorizada de escopo fechado** quando o controller antecipa
   divergência tolerável ("se X reclamar, normalize e avise — única variação
   livre").
4. **Terceiro caminho: divergir e relatar.** Se o texto do plano contradiz o
   critério de verificação do próprio plano, o implementer segue o critério e
   relata. BLOCKED é para ambiguidade, não para erro óbvio do plano.
5. **Proibição de git destrutivo** (`checkout -- .`, `checkout <sha> -- <path>`,
   `stash`, `reset`, `restore`, `clean`, `worktree remove`) — repositório
   compartilhado entre sessões paralelas; um review já colidiu com a stash de
   outra sessão. Vai no prompt-base, não na memória do controller.
6. **Não esperar teste em background**: foreground com timeout, ou report
   dizendo que não rodou.
7. **Artefato de prova fora do tree**: harness, stub, versão antiga
   (`git show <sha>:<path> >`) vão para diretório temporário/scratchpad — nunca
   para dentro do repo, mesmo que "depois apaga".

---

## 6. Estado da main na abertura

Main suja é **commit pendente**, não estado a preservar — se está na main, é
estável. Contrato do script de worktree (§7):

1. Modo verificação: main limpa → cria; suja → devolve `SUJO:` + lista, sem
   tocar em nada.
2. O agente **pergunta ao usuário**: "commita tudo" → re-roda com o parâmetro de
   commit de abertura (mensagem padrão, lista no corpo); "commita separado" →
   agente commita agrupado com mensagens reais e re-roda.
3. A worktree nasce da main limpa → o plano vai junto por consequência.
4. `reset`/`stash`/`checkout --` na main: proibidos. Preservar é commitar.
5. Branch única — colisão de nome (sessões paralelas) → sufixo.

Nenhum plano carrega task de cerimônia de estado de git; e main suja **nunca** se
resolve por `git status` manual + commit seletivo por fora do fluxo.

---

## 7. Scripts de processo — o contrato

Cada projeto implementa os seus; o contrato é fixo. Todos terminam com uma
**linha-sinal** e exit code: `OK …` (0) · `SUJO: …` (2, só worktree) ·
`FALTA: <o quê, nomeado>` (1). Auto-validação e idempotência são parte do
contrato — a LLM lê o sinal, não interpreta saída longa.

| Verbo | Devolve |
|---|---|
| **worktree** (abrir/fechar) | `OK <path>` — deps validadas, submódulos ok; ou `SUJO:`/`FALTA:` (§6) |
| **suíte global** | `OK <n> verdes, <k> pré-existentes` comparando com **baseline por sha** — separa *regressão* (era verde, agora não) de *pré-existente* de *gated* (trava de infra, não é falha de ninguém). Sem baseline: "indeterminado", sem atribuição |
| **banco de teste** | sobe infra, garante o banco de teste, **monta o schema**, injeta envs; `OK <n> tabelas` |
| (outros conforme o projeto) | mesmo contrato |

A **baseline** é gravada na base de destino antes da mudança e mora no checkout
principal (worktrees a enxergam). É ela que torna a atribuição de falha **fato**.

**Quando falta um script** (ou devolve `FALTA:`): nunca consertar inline —
simples → entregar prompt para sessão separada; complexo → arquivo de requisitos
+ dois prompts; crítico → plano bloqueado; não crítico → seguir sem o step e
reportar. **O prompt entregue vira pendência** (§9) com ponteiro — prompt só no
texto da resposta se perde (medido duas vezes).

---

## 8. Entrega ≠ merge

Quando o plano termina, a sessão **entrega o report e pergunta,
obrigatoriamente**, como o usuário quer finalizar. **Nunca mergeia por conta.**

| Opção do usuário | O que a sessão faz |
|---|---|
| **merge na base** | avalia (`git merge-tree`) → sem conflito → `merge --no-ff`; com conflito → resolve o mecânico e pergunta o que exigir julgamento → suíte na base via script → `OK` → fecha a worktree |
| **usar na worktree** | worktree fica de pé para validar antes de integrar; merge depois, a pedido |

**Rebase não é o caminho.** A base quase sempre avança durante a worktree — é o
objetivo das worktrees paralelas. Nunca dizer "precisa de rebase" por reflexo
(medido: dito duas vezes sem medir; interseção era vazia).

---

## 9. Pendências

`<pendencias-root>` (default `docs/pendencias/`) — pasta **geral** do que
precisa ser feito e não impediu a entrega. **Pendência ≠ insight**: insight é
melhoria observada; pendência é coisa a fazer.

- Um arquivo por sessão/plano (`YYYY-MM-DD-<nome>.md`), a partir de
  `templates/pendencias.template.md`. Tabela simples, **primeira coluna = área**
  (grep pela área varre a pasta).
- Registra **que existe + ponteiros**, nunca como resolver. No ato, não no
  encerramento — a sessão que morre sem fechamento é justamente a que perderia o
  registro adiado.
- **O uso é o aviso**: antes de mexer numa área, grep pela área na pasta e
  avisar o usuário do que está pendente (pegou colisão real entre dois planos em
  voo no primeiro dia de uso).

---

## 10. Sinal de atenção

O usuário opera várias sessões em paralelo. **Toda resposta que encerra um turno
termina com uma destas quatro formas fixas, em negrito, como última linha:**

- **⏳ Nada pendente de você — `<meia linha>`** — trabalho segue ("fase 2
  concluída, seguindo para a 3") ou só houve registro ("só docs, nada a
  testar"). O sinal de **menor** atenção e o mais comum no meio de um plano.
- **▶ Pode testar** — existe algo concreto para exercitar **e os passos estão
  logo acima**. Sem passo de teste acima, não é este sinal.
- **❓ Decisão: `<a pergunta, em uma linha>`** — basta ler a pergunta.
- **📖 Leia antes — `<meia linha do porquê>`** — o corpo muda o que ele faria.

Não é para escrever menos — o corpo rico alimenta o contexto. O sinal diz, de
relance, quanta atenção a sessão precisa agora. **Na dúvida entre dois, o de
menor atenção que ainda seja verdadeiro** — "Pode testar" falso custa mais que
"Nada pendente" conservador. (Origem: pedido explícito do usuário após 6h de
sessão; das 9 mensagens finais amostradas na 1ª rodada, só a que veio depois do
pedido sinalizava bem. A quarta forma entrou um dia depois: com três, "Pode
testar" virou "terminei algo" e apareceu no meio de fases e em respostas só de
docs.)

---

## 11. Limite de sessão e retomada

- Limite no meio de um dispatch: **parar** — sem retry, sem polling. Ao retomar,
  **redespachar do zero** com o mesmo prompt.
- **"Continua" não responde pergunta pendente.** Se havia bifurcação aberta, a
  retomada vai até o ponto da pergunta e **re-apresenta** — não escolhe pelo
  usuário (medido: "continua" lido como autorização para fase marcada "medição,
  contigo").

---

## 12. Checklist de verificação

- [ ] Fluxo classificado (ajuste/funcionalidade/processo/bug) e gatilho de risco
      aplicado (MUST)
- [ ] Plano: arquivos remendados foram abertos nesta sessão (MUST)
- [ ] Gate único antes do 1º dispatch; paradas intermediárias acordadas lá (MUST)
- [ ] Suíte global só via script; baseline existente antes da mudança (MUST)
- [ ] Review do conjunto rodou, re-rodou pós-correções, base atualizada —
      confirmado por escrito no report (MUST, gate da entrega)
- [ ] Entrega perguntou merge × worktree; nenhum merge sem pedido (MUST)
- [ ] Pendências registradas no ato; prompts de processo com pendência-ponte (SHOULD)
- [ ] Última linha de cada resposta com o sinal de atenção (MUST)

## 13. Anti-padrões

| Anti-padrão | Por quê |
|---|---|
| Mergear na base ao terminar o plano | entrega ≠ merge; a escolha é do usuário, por funcionalidade |
| "Precisa de rebase" sem `git merge-tree` | reflexo, não medição |
| Rodar suíte global na mão | atribuição vira julgamento; script + baseline tornam fato |
| Teste com banco "porque o plano sempre teve" | 4 execuções medidas: zero defeito pego, 2 confianças falsas |
| Oferta de pausa entre fases em texto livre | parada disfarçada; o gate já decidiu |
| Consertar script quebrado inline | contamina o contexto da funcionalidade; foi assim que um config local quebrou a base |
| Prompt de processo só no texto da resposta | se perde; vira pendência-ponte |
| Artefato de prova dentro do tree | classe do config local que quebrou a base pós-merge |
| Lição registrada só em memória privada do agente | invisível para auditoria; pendência/insight é o canal |

## 14. Composição com outros patterns

| Pattern | Como compõe |
|---|---|
| [`superpowers-workflow.md`](./superpowers-workflow.md) | skills e mapeamento papel→modelo; a cadência de testes/reviews é a deste doc |
| [`subagent-dispatch.md`](./subagent-dispatch.md) | como despachar; o prompt de dispatch §5 vive lá em detalhe |
| [`worktree.md`](./worktree.md) | setup técnico da worktree; o contrato de abertura é o §6 daqui |
| [`docs-structure.md`](./docs-structure.md) | posiciona `<pendencias-root>` |
| [`feedback-loop.md`](./feedback-loop.md) | fricção de processo → backlog; pendência de trabalho → §9 |

## 15. Inspirações e evolução

Extraído do dossiê "o plano erra na costura, não no desenho" (7 execuções,
hipótese original refutada — costura era 27% dos erros e 1 de ~19 críticos) e da
1ª rodada operando o processo (4 sessões, tempo ativo 1h28–4h16). Para evoluir:
nova forma de defeito só-visível-no-conjunto → §4 lista; novo verbo de script
recorrente → §7; nova forma de sinal → §10. Mudanças via PR + revisão.
