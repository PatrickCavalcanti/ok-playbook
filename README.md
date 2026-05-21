# ok-playbook

> 🚧 **Em construção incremental.** Estrutura inicial montada; conteúdo migrado a partir de `dev-prompts/project-architecture/ok-design-architecture/` do Igris. Será refinado em iterações, projeto a projeto.

## O que é

`ok-playbook` é o **canon vivo** de padrões da OK para:

- arquitetura de software, e
- colaboração humano↔IA durante o desenvolvimento.

A motivação: até hoje, padrões de arquitetura, convenções de skills, workflows de agentes e regras operacionais foram **copiados e colados** entre os projetos da OK. Isso quebra a melhoria contínua — uma evolução feita no projeto A nunca chega no projeto B.

Este repositório é a fonte única dessa documentação. Projetos consomem como submódulo + workspace package.

## Estrutura

```
ok-playbook/
├── README.md                        # este arquivo
├── INSTALL.md                       # protocolo de instalação no projeto consumidor (§)
├── patterns/                        # princípios agnósticos
│   ├── code-design.md               # 5 camadas, naming, fractal, ARCHITECTURE.md
│   ├── worktree.md                  # quando criar worktree, permissões Claude Code
│   ├── feedback-loop.md             # ciclo produtor → backlog → processador
│   ├── agent.md                     # quando criar agente, anatomia, trio canônico
│   └── subagent-dispatch.md         # política de modelos, granularidade, isolamento
├── agents/                          # protocolos agnósticos de agentes
│   ├── docs-review.md               # processador de feedback (consome feedback-loop)
│   └── new-agent.md                 # materializador de novos agentes
├── templates/                       # templates de artefatos
│   ├── feedback.md                  # template do registro de feedback
│   ├── draft.md                     # template de rascunho de novo agente
│   ├── insight.md                   # template de insight de evolução
│   └── ARCHITECTURE.md              # template para ARCHITECTURE.md de unidades
└── install/                         # snippets e templates do instalador
    ├── claude-md-snippet.md         # bloco a inserir no CLAUDE.md do consumidor
    ├── permissions-snippet.json     # permissões path-agnostic pra .claude/settings.json
    └── okplaybook-template.md       # template do manifesto OKPLAYBOOK.md gerado no root do consumidor
```

## Como começar — leitura recomendada

A ordem de dependência conceitual:

1. [`patterns/code-design.md`](patterns/code-design.md) — princípios de estruturação de código (pai filosófico).
2. [`patterns/feedback-loop.md`](patterns/feedback-loop.md) — ciclo agnóstico de feedback (base de muita coisa).
3. [`patterns/agent.md`](patterns/agent.md) — consome o feedback-loop; define o que é "agente".
4. [`patterns/worktree.md`](patterns/worktree.md) — isolamento físico do trabalho.
5. [`patterns/subagent-dispatch.md`](patterns/subagent-dispatch.md) — orquestração de subagentes (compõe com worktree).

Os agentes em [`agents/`](agents/) (`docs-review`, `new-agent`) são implementações concretas dos papéis canônicos definidos em `feedback-loop.md` e `agent.md`.

## Como é consumido

Em cada monorepo consumidor, o playbook entra como submódulo dentro de `packages/`:

```bash
git submodule add https://github.com/PatrickCavalcanti/ok-playbook.git packages/ok-playbook
```

E como workspace dep no consumidor (pnpm/yarn/npm workspaces):

```json
{
  "dependencies": {
    "ok-playbook": "workspace:*"
  }
}
```

Atualizar para a última versão publicada:

```bash
git submodule update --remote packages/ok-playbook
```

## Como instalar/configurar num projeto

Depois que o submódulo está presente, no projeto consumidor:

1. Abrir Claude Code na raiz do projeto.
2. Pedir: **"Instala o ok-playbook"** (ou equivalente).
3. Claude lê [`INSTALL.md`](INSTALL.md) e executa o protocolo: pergunta paths, propõe mudanças em `CLAUDE.md` e `.claude/settings.json`, copia templates, e gera `OKPLAYBOOK.md` no root do consumidor com o manifesto.

`OKPLAYBOOK.md` é o **registro de auditoria** — qual versão foi instalada, quais componentes estão ativos, quais paths foram customizados, quais próximos passos manuais ficaram pendentes.

Para atualizar (upgrade): rodar `git submodule update --remote packages/ok-playbook` e pedir "atualiza o ok-playbook" no Claude — ele lê INSTALL.md de novo, detecta `OKPLAYBOOK.md` existente, e roda o fluxo de upgrade preservando histórico.

## Como contribuir

Edições normalmente acontecem **dentro de um monorepo consumidor** (é onde está o contexto da mudança). Fluxo:

```bash
cd packages/ok-playbook
# editar arquivos
git add .
git commit -m "..."
git push origin main

# voltar pro super-repo e commitar a referência atualizada do submódulo
cd ../..
git add packages/ok-playbook
git commit -m "chore: bump ok-playbook"
```

⚠️ **Pegadinha clássica:** se você commitar a referência do submódulo no super-repo **sem ter pushado** o commit do submódulo, outros consumidores não vão conseguir clonar/buildar. Sempre push o submódulo primeiro.

## Status atual

| Componente | Estado |
|---|---|
| Patterns (5) | ✅ migrados de `dev-prompts/project-architecture/ok-design-architecture/` |
| Agents (docs-review, new-agent) | ✅ migrados — pendente review pra remover resíduo Igris-específico |
| Templates (4) | ✅ migrados |
| `INSTALL.md` + snippets | ✅ esqueleto pronto — falta validar contra instalação real |
| Agentes Igris-específicos (power, module, session-review) | ⏳ não migrados — domínio muito Igris; aguardam extração de versão agnóstica |

### Próximos passos previstos

- Review completo dos arquivos migrados pra remover qualquer resíduo Igris-específico (paths absolutos, nomenclatura de domínio).
- Primeiro install end-to-end num projeto consumidor real (validar o INSTALL.md).
- Decidir se outros partners agnósticos merecem ser extraídos (candidatos: `docs-architecture-partners`, `unit-architecture-doc-partners`).
- Extrair versões agnósticas dos agentes de domínio (power, module, session-review) quando o padrão estabilizar em 2+ projetos.

## Princípios para evolução

1. **Agnóstico de projeto** — se algo só faz sentido para um produto específico, não pertence a este repositório.
2. **Doc primeiro, código depois** — neste momento o playbook é majoritariamente markdown. CLI, scripts e templates executáveis vêm depois, quando houver demanda real.
3. **Navegável** — quem chega aqui (humano ou agente) precisa encontrar o que procura em poucos cliques.
4. **Linkável e estável** — projetos vão referenciar arquivos específicos deste repo; paths devem mudar o mínimo possível.
5. **Construção incremental** — refinar conforme uso em projetos novos descobre lacunas; não tentar prever tudo de cara.

## Mantenedor

Patrick Cavalcanti (OK)
