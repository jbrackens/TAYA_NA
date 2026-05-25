import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const matrix = JSON.parse(
  readFileSync(
    new URL("../docs/cashier/LAUNCH_READINESS_MATRIX.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(matrix.status, "blocked", "cashier must remain blocked before provider evidence");
assert.ok(Array.isArray(matrix.items), "launch readiness items must be an array");

const ids = new Set();
let blockerCount = 0;
for (const item of matrix.items) {
  assert.match(item.id, /^[a-z0-9-]+$/, "launch readiness ids must be stable slugs");
  assert.ok(!ids.has(item.id), `duplicate launch readiness item: ${item.id}`);
  ids.add(item.id);
  assert.ok(item.category, `${item.id} must include a category`);
  assert.ok(
    ["blocked", "pending", "complete", "waived"].includes(item.status),
    `${item.id} has unsupported status ${item.status}`,
  );
  assert.ok(item.description, `${item.id} must include a description`);
  if (item.publicBetaBlocker) {
    blockerCount += 1;
  }
  if (item.status === "complete") {
    assert.ok(item.evidence, `${item.id} cannot be complete without evidence`);
  }
  if (item.status === "waived") {
    assert.ok(item.riskAcceptance, `${item.id} waiver requires risk acceptance`);
  }
}

assert.ok(blockerCount >= 10, "launch matrix must track hard public-beta blockers");
assert.ok(
  ids.has("provider-tron-route-transcript"),
  "launch matrix must track provider route transcript",
);
assert.ok(
  ids.has("external-contract-audit"),
  "launch matrix must track external contract audit",
);

console.log("cashier launch readiness checks passed");
