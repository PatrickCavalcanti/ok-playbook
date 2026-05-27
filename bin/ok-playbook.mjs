#!/usr/bin/env node
// ok-playbook CLI — entrypoint.
// Roteia subcomandos para handlers em ../cli/.

import { argv, exit, stderr, stdout } from "node:process";

const [, , subcommand, ...rest] = argv;

const HELP = `ok-playbook — CLI

Usage:
  ok-playbook init    Setup do playbook no projeto atual
  ok-playbook help    Mostra esta ajuda

`;

async function main() {
  switch (subcommand) {
    case "init": {
      const { runInit } = await import("../cli/init.mjs");
      await runInit({ argv: rest, cwd: process.cwd() });
      return;
    }
    case "help":
    case "--help":
    case "-h":
    case undefined:
      stdout.write(HELP);
      return;
    default:
      stderr.write(`Subcomando desconhecido: ${subcommand}\n\n${HELP}`);
      exit(1);
  }
}

main().catch((err) => {
  stderr.write(`Erro: ${err.message}\n`);
  if (process.env.OKPLAYBOOK_DEBUG) {
    stderr.write(err.stack + "\n");
  }
  exit(1);
});
