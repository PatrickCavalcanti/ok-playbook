# Changelog

## 0.1.0 (2026-05-27)

MVP "consumível" do ok-playbook.

### Mudanças
- Pacote agora é instalável via git tag (`pnpm add git+ssh://...ok-playbook#v0.1.0`).
- CLI `ok-playbook init` substitui o protocolo manual de `INSTALL.md`.
- Include estável em `install/claude-md-include.md` referenciado via `@node_modules/ok-playbook/...`; placeholders não são mais substituídos no install, são resolvidos em runtime via `ok-playbook.config.json`.
- Init não pergunta modo de contribuição. `playbook-contribute` continua perguntando quando invocado com `contribution: unknown`.

### Conhecido (out of scope para 0.1.0)
- Skills, hooks, profiles, `git-rules.md` ainda precisam de cópia manual no consumidor — virarão plugin/shim em 0.2.
- `ok-playbook doctor`/`migrate` ainda não existem.
- Modo `external` de contribuição (gerar issue upstream) ainda não implementado.
