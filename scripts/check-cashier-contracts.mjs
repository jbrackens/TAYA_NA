import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import assert from "node:assert/strict";

const contractsDir = new URL("../contracts/src/", import.meta.url);
const files = readdirSync(contractsDir).filter((file) => file.endsWith(".sol"));

assert.ok(files.length > 0, "cashier contract interfaces must exist");

for (const file of files) {
  assert.match(file, /^I[A-Za-z0-9]+\.sol$/, `${file} must be an interface sketch`);
  const source = readFileSync(new URL(file, contractsDir), "utf8");
  assert.ok(source.includes("interface "), `${file} must declare an interface`);
  assert.ok(!/\bcontract\s+[A-Za-z0-9_]+/.test(source), `${file} must not declare deployable contracts before audit`);
  assert.ok(source.includes("Do not deploy") || source.includes("Interface sketch only"), `${file} must carry a no-deploy warning`);
}

const invariants = readFileSync(
  new URL("../contracts/INVARIANTS.md", import.meta.url),
  "utf8",
);

for (const required of [
  "A deposit intent id can mint at most once",
  "Recovery action ids are unique",
  "A trade authorization can be consumed at most once",
  "No approval-for-all, delegatecall, arbitrary transfer, or upgrade selector",
  "External audit before public beta",
]) {
  assert.ok(invariants.includes(required), `missing contract invariant: ${required}`);
}

console.log("cashier contract checks passed");
