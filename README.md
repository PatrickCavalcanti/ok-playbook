# ok-playbook

Skill que configura o processo de desenvolvimento para agentes de código
(Claude Code, Codex): regras para `CLAUDE.md`/`AGENTS.md`, protocolos de agentes,
patterns de arquitetura e colaboração, templates e hooks de permissão.

Depois de configurado, o projeto é **autocontido** — o agente lê tudo de dentro
dele, sem precisar da skill instalada. A skill só entra para configurar,
atualizar/auditar e contribuir de volta.

## Quer entender antes de instalar?

Mande isto para o seu agente (Claude Code, Codex), aberto no seu projeto:

```text
Leia o repositório https://github.com/PatrickCavalcanti/ok-playbook — comece
pelo README e por references/patterns/visao-geral.md — e me explique, olhando
este projeto, o que mudaria se eu configurasse o ok-playbook aqui: arquivos que
seriam criados ou alterados, o que muda no seu comportamento a cada sessão, o
que mexe na minha máquina e o que eu poderia recusar. Não instale nem altere
nada.
```

O resumo para leitura humana é a mesma
[`visao-geral.md`](references/patterns/visao-geral.md): pastas, comportamento do
agente em toda sessão, spec e plano, uso com desk de workers, o que ele não faz
sem você e o que mexe na sua máquina.

## Instalação

Mande isto para o seu agente, aberto no projeto que você quer configurar:

```text
Instale a skill ok-playbook a partir de
https://github.com/PatrickCavalcanti/ok-playbook, seguindo a seção "Instalação"
do README dele, e depois configure este projeto com ela.
```

A configuração começa mostrando o que vai mudar e perguntando o que deve ficar
de fora; nada é escrito no projeto antes disso.

### Passos (o que o agente faz — ou você, à mão)

1. **Clonar direto na pasta de skills** — o diretório da skill precisa ser um
   clone git (é por ele que a skill se atualiza e que as contribuições saem):

   ```bash
   git clone https://github.com/PatrickCavalcanti/ok-playbook.git ~/.claude/skills/ok-playbook
   ```

   No Windows: `git clone https://github.com/PatrickCavalcanti/ok-playbook.git "%USERPROFILE%\.claude\skills\ok-playbook"`.
   Se o clone já existe em outro lugar, ligue-o em vez de clonar de novo — junction
   no Windows (`mklink /J "%USERPROFILE%\.claude\skills\ok-playbook" "C:\caminho\para\ok-playbook"`,
   sem privilégio de administrador), `ln -s` em Linux/macOS.
2. **Codex** (se usar também): ligue o mesmo clone em `~/.codex/skills/ok-playbook`
   (ou `~/.agents/skills/ok-playbook`) — um clone só para as duas CLIs.
3. **Conferir**: `~/.claude/skills/ok-playbook/SKILL.md` existe e a skill
   `ok-playbook` aparece na lista de skills do agente. Se não aparecer na sessão
   atual, abra uma sessão nova.
4. **Configurar o projeto**: peça "configura o ok-playbook neste projeto". A
   skill segue o Modo 1 do [`SKILL.md`](SKILL.md): apresenta a visão geral,
   pergunta o que fica de fora, propõe os caminhos, mostra o `plan`, aplica e
   termina com um resumo do que foi instalado e a proposta de commit.

### Atualizar

`git -C ~/.claude/skills/ok-playbook pull` e, em cada projeto, peça "revalida o
ok-playbook" (modo atualizar): a skill mostra o que mudou no canon, item por
item, e pergunta antes de sobrescrever o que o projeto customizou.

## Uso

A skill tem três modos (detalhes no [`SKILL.md`](SKILL.md)), além de responder
"o que o ok-playbook faz?" a partir da visão geral:

- **Configurar** — projeto sem `ok-playbook.json`: define os caminhos, mostra o `plan` e materializa o canon no projeto.
- **Atualizar/auditar** — projeto já configurado: compara o que está no projeto com o canon, item por item, e oferece atualizar, manter ou marcar como customização local.
- **Contribuir** — leva uma mudança surgida no projeto (insight, feedback) de volta ao playbook.

A parte mecânica é de `scripts/ok-playbook.mjs` (`plan`, `apply`, `status`); o
julgamento é do agente e do dono do projeto.

## O que fica no projeto

Placeholders são resolvidos na materialização — o projeto não consulta config em
tempo de uso.

| Destino | Conteúdo |
|---|---|
| `CLAUDE.md` e `AGENTS.md` | bloco `<!-- ok-playbook:start v<versão> -->` … `<!-- ok-playbook:end -->` com as regras; resto do arquivo intocado |
| `.claude/skills/<agente>/SKILL.md` + espelho `.agents/skills/<agente>/SKILL.md` | protocolo inteiro de cada agente |
| `<docs>/ok-playbook/patterns/` (default `docs/ok-playbook/patterns/`) | patterns como doc de consulta |
| pastas de backlog, pendências, drafts, insights, arquitetura | templates (só se ausentes) |
| `scripts/`, `.claude/hooks/`, `.claude/settings.json` | scripts e hooks adaptados; merge de `permissions.allow` |
| `ok-playbook.json` | versão e sha de origem, caminhos do projeto e, por item, `{ destino, origem, hash, estado }` |

### Estados do manifesto

- `materializado` — cópia do canon; atualiza automaticamente se o hash bate.
- `customizado` — o dono escolheu manter a versão local; `status` só avisa quando o canon muda na origem.
- `do-projeto` — o projeto implementa (ex.: um `suite.mjs` próprio); a skill só confere o contrato (linha-sinal `OK`/`SUJO:`/`FALTA:`).

## Contribuindo

Repositório: <https://github.com/PatrickCavalcanti/ok-playbook>.

Mudança que surge num projeto volta ao playbook pelo modo **Contribuir** da skill
(protocolo em [`references/agents/playbook-contribute.md`](references/agents/playbook-contribute.md)),
de uma de duas formas, conforme o campo `contribuicao` do `ok-playbook.json`:

- **Issue** (`request`, o padrão de quem só instalou a skill) — a proposta
  descrita, com o insight que a motivou, para o mantenedor avaliar e aplicar.
- **Pull request** (`branch-pr`) — a mudança pronta, numa branch do seu fork.

O agente abre a issue ou o PR pelo caminho que o seu ambiente tiver (`gh`,
integração do GitHub, outra CLI); sem nenhum, ele entrega o texto pronto para
você publicar. Nada é publicado sem o seu sim. Issues e PRs abertos à mão também
são bem-vindos.

## Desenvolvimento

Sem dependências. Testes:

```bash
node --test --test-force-exit "scripts/__tests__/*.test.mjs"
```

Layout: `SKILL.md`, `VERSION`, `scripts/`, `references/{patterns,agents}`,
`assets/{rules.md,templates,hooks,scripts,settings-snippet.json}`.

## Licença

MIT — ver [`LICENSE`](LICENSE).
