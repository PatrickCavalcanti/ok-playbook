// packages/ok-playbook/cli/lib/folders.mjs
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function copyIfMissing(src, dest) {
  if (existsSync(dest)) return { copied: false, reason: "exists" };
  ensureDir(dirname(dest));
  copyFileSync(src, dest);
  return { copied: true };
}

function writeIfMissing(dest, content) {
  if (existsSync(dest)) return { written: false, reason: "exists" };
  ensureDir(dirname(dest));
  writeFileSync(dest, content, "utf8");
  return { written: true };
}

export function scaffoldFolders(projectRoot, { paths, pkgRoot }) {
  if (!paths) throw new Error("scaffoldFolders: 'paths' é obrigatório");
  if (!pkgRoot) throw new Error("scaffoldFolders: 'pkgRoot' é obrigatório");

  copyIfMissing(
    join(pkgRoot, "templates", "feedback.md"),
    join(projectRoot, paths.backlog, "_template.md"),
  );
  copyIfMissing(
    join(pkgRoot, "templates", "draft.md"),
    join(projectRoot, paths.drafts, "_template.md"),
  );
  copyIfMissing(
    join(pkgRoot, "templates", "insight.md"),
    join(projectRoot, paths.insights, "_template.md"),
  );
  // <pendencias-root> (dev-process.md §9) — path opcional; readConfig preenche o
  // default quando o config é anterior a 0.4.
  if (paths.pendencias) {
    copyIfMissing(
      join(pkgRoot, "templates", "pendencias.template.md"),
      join(projectRoot, paths.pendencias, "_template.md"),
    );
  }

  for (const sub of ["drafts", "specs/done", "plans/done"]) {
    writeIfMissing(join(projectRoot, paths.superpowers, sub, ".gitkeep"), "");
  }

  copyIfMissing(
    join(pkgRoot, "templates", "_index.template.md"),
    join(projectRoot, paths.arch, "_index.md"),
  );
  copyIfMissing(
    join(pkgRoot, "templates", "ARCHITECTURE.md"),
    join(projectRoot, paths.arch, "templates", "ARCHITECTURE.template.md"),
  );
  ensureDir(join(projectRoot, paths.agents));
}
