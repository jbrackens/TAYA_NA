#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts/frontend_dependency_baseline_$(date +%Y%m%d_%H%M%S)"
REPORT_FILE="$ROOT_DIR/revival/195_FRONTEND_DEPENDENCY_MODERNIZATION_BASELINE.md"
DATE_TAG="$(date +%F)"

mkdir -p "$ARTIFACT_DIR"

if ! command -v yarn >/dev/null 2>&1; then
  echo "error: yarn is required" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required" >&2
  exit 1
fi

run_outdated_scan() {
  local name="$1"
  local repo_dir="$2"
  local scan_log="$ARTIFACT_DIR/${name}_yarn_outdated.jsonl"
  local summary_json="$ARTIFACT_DIR/${name}_summary.json"

  if [[ ! -d "$repo_dir" ]]; then
    echo "error: missing repo directory for scan: $repo_dir" >&2
    return 1
  fi

  (
    cd "$repo_dir"
    set +e
    yarn outdated --json >"$scan_log" 2>&1
    scan_exit_code=$?
    set -e
    if [[ "$scan_exit_code" -ne 0 && "$scan_exit_code" -ne 1 ]]; then
      echo "{\"scanError\":\"yarn outdated failed with exit code $scan_exit_code\"}" >"$summary_json"
      exit "$scan_exit_code"
    fi
  )

  node - "$scan_log" "$summary_json" <<'NODE'
const fs = require("fs");

const scanPath = process.argv[2];
const summaryPath = process.argv[3];
const raw = fs.readFileSync(scanPath, "utf8");
const lines = raw.split(/\r?\n/).filter(Boolean);

const rows = [];
for (const line of lines) {
  try {
    const parsed = JSON.parse(line);
    if (parsed && parsed.type === "table" && parsed.data && Array.isArray(parsed.data.body)) {
      for (const row of parsed.data.body) {
        rows.push(row);
      }
    }
  } catch (_error) {
    // Ignore non-JSON lines from yarn and continue.
  }
}

const semverTuple = (value) => {
  const match = String(value || "").match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
};

const classify = (current, latest) => {
  const c = semverTuple(current);
  const l = semverTuple(latest);
  if (!c || !l) return "unknown";
  if (l.major > c.major) return "major";
  if (l.minor > c.minor) return "minor";
  if (l.patch > c.patch) return "patch";
  return "none";
};

const entries = rows.map((row) => {
  const [pkg, current, wanted, latest, workspace, packageType, url] = row;
  return {
    package: pkg,
    current,
    wanted,
    latest,
    workspace,
    packageType,
    url,
    updateClass: classify(current, latest),
  };
});

const totals = {
  packages: entries.length,
  major: entries.filter((e) => e.updateClass === "major").length,
  minor: entries.filter((e) => e.updateClass === "minor").length,
  patch: entries.filter((e) => e.updateClass === "patch").length,
  unknown: entries.filter((e) => e.updateClass === "unknown").length,
};

const top = entries.slice(0, 50);
fs.writeFileSync(summaryPath, JSON.stringify({ totals, entries: top }, null, 2));
NODE
}

format_summary_table() {
  local name="$1"
  local summary_json="$2"
  local markdown_file="$ARTIFACT_DIR/${name}_top_updates.md"

  node - "$summary_json" "$markdown_file" <<'NODE'
const fs = require("fs");
const summaryPath = process.argv[2];
const markdownPath = process.argv[3];
const parsed = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

const lines = [];
lines.push("| Package | Current | Latest | Workspace | Type | Class |");
lines.push("|---|---|---|---|---|---|");

for (const item of parsed.entries.slice(0, 25)) {
  lines.push(
    `| ${item.package} | ${item.current} | ${item.latest} | ${item.workspace} | ${item.packageType} | ${item.updateClass} |`
  );
}

fs.writeFileSync(markdownPath, `${lines.join("\n")}\n`);
NODE
}

run_outdated_scan "office_backoffice" "$ROOT_DIR/frontend"
run_outdated_scan "taptrade_player_app" "$ROOT_DIR/frontend/packages/app"

format_summary_table "office_backoffice" "$ARTIFACT_DIR/office_backoffice_summary.json"
format_summary_table "taptrade_player_app" "$ARTIFACT_DIR/taptrade_player_app_summary.json"

office_totals="$(node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(`${p.totals.packages}|${p.totals.major}|${p.totals.minor}|${p.totals.patch}|${p.totals.unknown}`);' "$ARTIFACT_DIR/office_backoffice_summary.json")"
player_totals="$(node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(`${p.totals.packages}|${p.totals.major}|${p.totals.minor}|${p.totals.patch}|${p.totals.unknown}`);' "$ARTIFACT_DIR/taptrade_player_app_summary.json")"

IFS='|' read -r office_packages office_major office_minor office_patch office_unknown <<<"$office_totals"
IFS='|' read -r player_packages player_major player_minor player_patch player_unknown <<<"$player_totals"

{
  echo "# Frontend Dependency Modernization Baseline ($DATE_TAG)"
  echo
  echo "Generated via:"
  echo
  echo '```bash'
  echo "make frontend-deps-baseline"
  echo '```'
  echo
  echo "Artifact directory: \`$ARTIFACT_DIR\`"
  echo
  echo "## Summary"
  echo
  echo "| Surface | Packages | Major | Minor | Patch | Unknown | Raw Scan | Parsed Summary |"
  echo "|---|---:|---:|---:|---:|---:|---|---|"
  echo "| TapTrade office Backoffice | $office_packages | $office_major | $office_minor | $office_patch | $office_unknown | \`$ARTIFACT_DIR/office_backoffice_yarn_outdated.jsonl\` | \`$ARTIFACT_DIR/office_backoffice_summary.json\` |"
  echo "| TapTrade Player App | $player_packages | $player_major | $player_minor | $player_patch | $player_unknown | \`$ARTIFACT_DIR/taptrade_player_app_yarn_outdated.jsonl\` | \`$ARTIFACT_DIR/taptrade_player_app_summary.json\` |"
  echo
  echo "## Top Outdated Packages (First 25)"
  echo
  echo "### TapTrade office Backoffice"
  cat "$ARTIFACT_DIR/office_backoffice_top_updates.md"
  echo
  echo "### TapTrade Player App"
  cat "$ARTIFACT_DIR/taptrade_player_app_top_updates.md"
  echo
  echo "## Next Upgrade Wave Guidance"
  echo
  echo "1. Start with patch/minor upgrades in shared dev tooling (\`@types/*\`, lint/test stack) before framework majors."
  echo "2. Defer major framework jumps (\`next\`, \`react\`, \`typescript\`) to dedicated compatibility branches."
  echo "3. Re-run \`make verify-sportsbook\` (TapTrade player compatibility alias) and \`make verify-office\` after each batch."
} >"$REPORT_FILE"

echo "Dependency baseline report: $REPORT_FILE"
echo "Dependency baseline artifacts: $ARTIFACT_DIR"
