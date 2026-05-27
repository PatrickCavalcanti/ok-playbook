// packages/ok-playbook/cli/lib/include.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CLAUDE_MD = "CLAUDE.md";
const START_MARKER = "<!-- ok-playbook:include:start -->";
const END_MARKER = "<!-- ok-playbook:include:end -->";
const INCLUDE_BLOCK = [
  START_MARKER,
  "@node_modules/ok-playbook/install/claude-md-include.md",
  END_MARKER,
  "",
].join("\n");

export function hasInclude(projectRoot) {
  const p = join(projectRoot, CLAUDE_MD);
  if (!existsSync(p)) return false;
  return readFileSync(p, "utf8").includes(START_MARKER);
}

export function appendInclude(projectRoot) {
  const p = join(projectRoot, CLAUDE_MD);
  const existing = existsSync(p) ? readFileSync(p, "utf8") : "";
  if (existing.includes(START_MARKER)) {
    return { written: false, reason: "already-installed" };
  }
  const separator = existing.length === 0 || existing.endsWith("\n") ? "" : "\n";
  const next = existing + separator + (existing.length > 0 ? "\n" : "") + INCLUDE_BLOCK;
  writeFileSync(p, next, "utf8");
  return { written: true };
}
