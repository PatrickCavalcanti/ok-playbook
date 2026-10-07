# ok-playbook

Skill que configura o processo de desenvolvimento para agentes de código
(Claude Code, Codex): regras para `CLAUDE.md`/`AGENTS.md`, protocolos de agentes,
patterns de arquitetura e colaboração, templates e hooks de permissão.

Depois de configurado, o projeto é **autocontido** — o agente lê tudo de dentro
dele, sem precisar da skill instalada. A skill só entra para configurar,
atualizar/auditar e contribuir de volta.

## Instalação

Clone o repositório e ligue-o ao diretório de skills do agente.

```bash
git clone https://github.com/PatrickCavalcanti/ok-playbook.git
```

- **Claude Code:** link em `~/.claude/skills/ok-playbook`
- **Codex:** link em `~/.codex/skills/ok-playbook` (ou `~/.agents/skills/ok-playbook`)

No Windows, use junction (não exige privilégio de administrador):

```bat
mklink /J "%USERPROFILE%\.claude\skills\ok-playbook" "C:\caminho\para\ok-playbook"
```

Em Linux/macOS: `ln -s /caminho/para/ok-playbook ~/.claude/skills/ok-playbook`.

## Uso

A skill tem três modos (detalhes no [`SKILL.md`](SKILL.md)):

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

## Desenvolvimento

Sem dependências. Testes:

```bash
node --test --test-force-exit scripts/__tests__/
```

Layout: `SKILL.md`, `VERSION`, `scripts/`, `references/{patterns,agents}`,
`assets/{rules.md,templates,hooks,scripts,settings-snippet.json}`.

## Licença

MIT — ver [`LICENSE`](LICENSE).
