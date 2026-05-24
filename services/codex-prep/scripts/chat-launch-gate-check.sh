#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
EVIDENCE_FILE="${CHAT_LAUNCH_EVIDENCE_FILE:-$ROOT/docs/chat-launch-evidence.md}"
REQUIRE_OPTIONAL_POST_V1="${REQUIRE_OPTIONAL_POST_V1:-false}"

if [[ ! -f "$EVIDENCE_FILE" ]]; then
  echo "FAIL: launch evidence file not found: $EVIDENCE_FILE" >&2
  exit 1
fi

node - "$EVIDENCE_FILE" "$REQUIRE_OPTIONAL_POST_V1" <<'NODE'
const fs = require("fs");

const file = process.argv[2];
const requireOptional = process.argv[3] === "true";
const text = fs.readFileSync(file, "utf8");
const lines = text.split(/\r?\n/);

const requiredSections = new Set([
  "1. Production/Staging Header Validation",
  "2. Rocket.Chat Admin and License Review",
  "3. Moderation Setup",
  "4. Compliance and Retention",
  "5. Staging Rollout",
  "Rollback Evidence",
]);

if (requireOptional) {
  requiredSections.add("6. Optional Post-v1 Backlog");
}

let currentSection = "";
const incomplete = [];

for (const line of lines) {
  const heading = line.match(/^##\s+(.+?)\s*$/);
  if (heading) {
    currentSection = heading[1];
    continue;
  }

  const checkbox = line.match(/^-\s+\[([ xX])\]\s+(.+?)\s*$/);
  if (!checkbox || !requiredSections.has(currentSection)) {
    continue;
  }

  const checked = checkbox[1].toLowerCase() === "x";
  if (!checked) {
    incomplete.push(`${currentSection}: ${checkbox[2]}`);
  }
}

if (incomplete.length > 0) {
  console.error(`FAIL: ${incomplete.length} required chat launch evidence item(s) are incomplete.`);
  for (const item of incomplete) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log("PASS: required chat launch evidence items are complete.");
NODE
