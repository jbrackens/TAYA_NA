import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(new URL("..", import.meta.url).pathname);
// The cashier workstream is dormant: its docs were archived to docs/archive/cashier
// on 2026-09-06 when the product settled on non-redeemable points. The guard still
// runs — the docs must stay internally consistent even while the workstream sleeps.
const docsRoot = resolve(root, "docs/archive/cashier");

function listMarkdown(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const absolute = resolve(dir, entry);
    if (statSync(absolute).isDirectory()) {
      files.push(...listMarkdown(absolute));
    } else if (absolute.endsWith(".md")) {
      files.push(absolute);
    }
  }
  return files;
}

for (const absoluteDoc of listMarkdown(docsRoot)) {
  const text = readFileSync(absoluteDoc, "utf8");
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of text.matchAll(linkPattern)) {
    const target = match[1];
    if (
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("#")
    ) {
      continue;
    }
    const cleanTarget = target.split("#")[0];
    assert.ok(
      existsSync(resolve(dirname(absoluteDoc), cleanTarget)),
      `${absoluteDoc} links to missing file ${target}`,
    );
  }
}

console.log("cashier doc link checks passed");
