#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REVIVAL_DIR="$ROOT/revival"
ARTIFACT_DIR="$REVIVAL_DIR/artifacts"
REPORT_PATH="${SCENARIO_11_API_SURFACE_REPORT:-$REVIVAL_DIR/94_SCENARIO_11_API_SURFACE_GATE.md}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"
ARTIFACT_PATH="$ARTIFACT_DIR/scenario_11_api_surface_gate_${TIMESTAMP}.md"

OPENAPI_PATH="$ROOT/go-platform/services/gateway/api/openapi.yaml"
PREDICTION_CLIENT_PATH="$ROOT/talon-backoffice/packages/api-client/src/prediction-client.ts"
API_CLIENT_PATH="$ROOT/talon-backoffice/packages/api-client/src/client.ts"
PLAYER_WALLET_CLIENT_PATH="$ROOT/talon-backoffice/packages/app/app/lib/api/wallet-client.ts"

mkdir -p "$ARTIFACT_DIR"

node - "$OPENAPI_PATH" "$PREDICTION_CLIENT_PATH" "$API_CLIENT_PATH" "$PLAYER_WALLET_CLIENT_PATH" "$REPORT_PATH" "$ARTIFACT_PATH" <<'NODE'
const fs = require("fs");
const path = require("path");

const [
  ,
  ,
  openapiPath,
  predictionClientPath,
  apiClientPath,
  playerWalletClientPath,
  reportPath,
  artifactPath,
] = process.argv;

const openapi = fs.readFileSync(openapiPath, "utf8");
const predictionClient = fs.readFileSync(predictionClientPath, "utf8");
const apiClient = fs.readFileSync(apiClientPath, "utf8");
const playerWalletClient = fs.readFileSync(playerWalletClientPath, "utf8");
const clientSource = `${predictionClient}\n${apiClient}\n${playerWalletClient}`;

function pathBlock(route) {
  const marker = `  ${route}:`;
  const start = openapi.indexOf(marker);
  if (start === -1) return null;
  const rest = openapi.slice(start + marker.length);
  const next = rest.search(/\n  \/api\/v1\//);
  return next === -1 ? rest : rest.slice(0, next);
}

function hasOperation(route, method) {
  const block = pathBlock(route);
  if (!block) return false;
  const re = new RegExp(`\\n    ${method.toLowerCase()}:`);
  return re.test(`\n${block}`);
}

function hasParameter(route, name) {
  const block = pathBlock(route);
  if (!block) return false;
  return new RegExp(`name:\\s*${name}\\b`).test(block);
}

function hasClientMethod(name) {
  return new RegExp(`\\basync\\s+${name}\\s*\\(`).test(clientSource)
    || new RegExp(`\\bfunction\\s+${name}\\s*\\(`).test(clientSource)
    || new RegExp(`\\bexport\\s+async\\s+function\\s+${name}\\s*\\(`).test(clientSource)
    || new RegExp(`\\bconst\\s+${name}\\s*=\\s*async\\b`).test(clientSource)
    || new RegExp(`\\b${name}\\s*:\\s*async\\b`).test(clientSource);
}

const requirements = [
  {
    label: "List markets",
    checks: [{ kind: "operation", method: "get", route: "/api/v1/markets" }],
    clientMethods: ["getMarkets"],
  },
  {
    label: "Search and filter markets",
    checks: [
      { kind: "operation", method: "get", route: "/api/v1/markets" },
      { kind: "parameter", route: "/api/v1/markets", name: "q" },
      { kind: "parameter", route: "/api/v1/markets", name: "sort" },
      { kind: "parameter", route: "/api/v1/markets", name: "seriesId" },
      { kind: "parameter", route: "/api/v1/markets", name: "tag" },
    ],
    clientMethods: ["getMarkets"],
  },
  {
    label: "Get market",
    checks: [{ kind: "operation", method: "get", route: "/api/v1/markets/{ticker}" }],
    clientMethods: ["getMarket"],
  },
  {
    label: "List categories, series, and tags",
    checks: [
      { kind: "operation", method: "get", route: "/api/v1/categories" },
      { kind: "operation", method: "get", route: "/api/v1/series" },
      { kind: "operation", method: "get", route: "/api/v1/tags" },
    ],
    clientMethods: ["getCategories", "getSeries", "getTags"],
  },
  {
    label: "Get price history",
    checks: [{ kind: "operation", method: "get", route: "/api/v1/markets/{id}/prices" }],
    clientMethods: ["getMarketPriceHistory"],
  },
  {
    label: "Get order book/depth",
    checks: [{ kind: "operation", method: "get", route: "/api/v1/markets/{id}/orderbook" }],
    clientMethods: ["getOrderBook"],
  },
  {
    label: "Create prediction/trade/order",
    checks: [{ kind: "operation", method: "post", route: "/api/v1/orders" }],
    clientMethods: ["placeOrder"],
  },
  {
    label: "Cancel order",
    checks: [{ kind: "operation", method: "delete", route: "/api/v1/orders/{id}" }],
    clientMethods: ["cancelOrder"],
  },
  {
    label: "Get user positions",
    checks: [{ kind: "operation", method: "get", route: "/api/v1/portfolio" }],
    clientMethods: ["getPositions"],
  },
  {
    label: "Get user orders",
    checks: [{ kind: "operation", method: "get", route: "/api/v1/orders" }],
    clientMethods: ["getOrders"],
  },
  {
    label: "Get user and global activity",
    checks: [
      { kind: "operation", method: "get", route: "/api/v1/social/users/{userId}/activity" },
      { kind: "operation", method: "get", route: "/api/v1/social/activity" },
    ],
  },
  {
    label: "Get and create comments/replies",
    checks: [
      { kind: "operation", method: "get", route: "/api/v1/social/markets/{marketId}/comments" },
      { kind: "operation", method: "post", route: "/api/v1/social/markets/{marketId}/comments" },
    ],
  },
  {
    label: "React to and report comments",
    checks: [
      { kind: "operation", method: "post", route: "/api/v1/social/comments/{commentId}/react" },
      { kind: "operation", method: "post", route: "/api/v1/social/comments/{commentId}/report" },
    ],
  },
  {
    label: "Follow user and read profile",
    checks: [
      { kind: "operation", method: "get", route: "/api/v1/social/users/{userId}/profile" },
      { kind: "operation", method: "post", route: "/api/v1/social/users/{userId}/follow" },
    ],
  },
  {
    label: "Get leaderboard and entries",
    checks: [
      { kind: "operation", method: "get", route: "/api/v1/leaderboards" },
      { kind: "operation", method: "get", route: "/api/v1/leaderboards/{id}/entries" },
      { kind: "operation", method: "get", route: "/api/v1/me/leaderboards" },
    ],
  },
  {
    label: "Rewards, missions, streaks, point packs, and badges",
    checks: [
      { kind: "operation", method: "post", route: "/api/v1/wallet/daily-claim" },
      { kind: "operation", method: "get", route: "/api/v1/wallet/point-packs" },
      { kind: "operation", method: "post", route: "/api/v1/wallet/point-packs/claim" },
      { kind: "operation", method: "get", route: "/api/v1/wallet/missions" },
      { kind: "operation", method: "post", route: "/api/v1/wallet/missions/claim" },
      { kind: "operation", method: "get", route: "/api/v1/wallet/streaks" },
      { kind: "operation", method: "post", route: "/api/v1/wallet/streaks/claim" },
      { kind: "operation", method: "get", route: "/api/v1/wallet/badges" },
      { kind: "operation", method: "get", route: "/api/v1/wallet/reward-limits" },
    ],
  },
  {
    label: "Resolve market",
    checks: [
      { kind: "operation", method: "post", route: "/api/v1/admin/markets/{id}/propose" },
      { kind: "operation", method: "post", route: "/api/v1/admin/markets/{id}/finalize" },
    ],
    clientMethods: ["settleMarket"],
  },
  {
    label: "Settle and replay settlement",
    checks: [
      { kind: "operation", method: "post", route: "/api/v1/admin/settlements/{marketId}" },
      { kind: "operation", method: "post", route: "/api/v1/admin/settlements/replay" },
    ],
    clientMethods: ["settleMarket", "replayIncompleteSettlements"],
  },
  {
    label: "Get point ledger",
    checks: [
      { kind: "operation", method: "get", route: "/api/v1/wallet/{userId}/ledger" },
      { kind: "operation", method: "get", route: "/api/v1/admin/punters/{id}/wallet" },
    ],
    clientMethods: ["getWalletLedger"],
  },
  {
    label: "Admin market, taxonomy, user, report, and export APIs",
    checks: [
      { kind: "operation", method: "get", route: "/api/v1/admin/markets" },
      { kind: "operation", method: "post", route: "/api/v1/admin/markets" },
      { kind: "operation", method: "get", route: "/api/v1/admin/markets/{id}/lifecycle" },
      { kind: "operation", method: "get", route: "/api/v1/admin/categories" },
      { kind: "operation", method: "get", route: "/api/v1/admin/series" },
      { kind: "operation", method: "get", route: "/api/v1/admin/tags" },
      { kind: "operation", method: "get", route: "/api/v1/admin/punters" },
      { kind: "operation", method: "get", route: "/api/v1/admin/prediction/risk" },
      { kind: "operation", method: "get", route: "/api/v1/admin/social/reports" },
      { kind: "operation", method: "get", route: "/api/v1/admin/dashboard/volume" },
      { kind: "operation", method: "get", route: "/api/v1/admin/wallet/reconciliation" },
    ],
    clientMethods: ["getAdminMarkets", "createMarket", "getMarketLifecycleAudit", "exportMarketLifecycleAudit"],
  },
];

function evaluateCheck(check) {
  if (check.kind === "operation") {
    const ok = hasOperation(check.route, check.method);
    return {
      ok,
      label: `${check.method.toUpperCase()} ${check.route}`,
      evidence: ok ? "OpenAPI operation present" : "missing OpenAPI operation",
    };
  }
  if (check.kind === "parameter") {
    const ok = hasParameter(check.route, check.name);
    return {
      ok,
      label: `${check.route} query ${check.name}`,
      evidence: ok ? "OpenAPI parameter present" : "missing OpenAPI parameter",
    };
  }
  return { ok: false, label: JSON.stringify(check), evidence: "unknown check kind" };
}

const rows = [];
const failures = [];
for (const requirement of requirements) {
  const checkResults = requirement.checks.map(evaluateCheck);
  const clientResults = (requirement.clientMethods || []).map((name) => ({
    name,
    ok: hasClientMethod(name),
  }));
  const failedChecks = checkResults.filter((result) => !result.ok);
  const failedClientMethods = clientResults.filter((result) => !result.ok);
  const ok = failedChecks.length === 0 && failedClientMethods.length === 0;
  if (!ok) {
    for (const failed of failedChecks) failures.push(`${requirement.label}: ${failed.evidence} (${failed.label})`);
    for (const failed of failedClientMethods) failures.push(`${requirement.label}: missing client method ${failed.name}`);
  }
  rows.push({
    label: requirement.label,
    status: ok ? "pass" : "fail",
    openapi: checkResults.map((result) => `${result.ok ? "pass" : "fail"} ${result.label}`).join("<br>"),
    client: clientResults.length
      ? clientResults.map((result) => `${result.ok ? "pass" : "fail"} ${result.name}`).join("<br>")
      : "not required",
  });
}

const result = failures.length === 0 ? "pass" : "fail";
const generatedAt = new Date().toISOString();
const lines = [];
lines.push("# Scenario 11 API Surface Gate");
lines.push("");
lines.push(`- Generated: \`${generatedAt}\``);
lines.push(`- Result: **${result}**`);
lines.push(`- OpenAPI: \`${openapiPath}\``);
lines.push("- Decision: Scenario 11 requires all required public/internal API surfaces or shared service methods to be documented and reviewable.");
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push("| Requirement | Status | OpenAPI Evidence | Client/Service Evidence |");
lines.push("|---|---|---|---|");
for (const row of rows) {
  lines.push(`| ${row.label} | ${row.status} | ${row.openapi} | ${row.client} |`);
}
lines.push("");
if (failures.length > 0) {
  lines.push("## Failures");
  lines.push("");
  for (const failure of failures) lines.push(`- ${failure}`);
  lines.push("");
} else {
  lines.push("## Verification");
  lines.push("");
  lines.push("- Every Scenario 11 API requirement has an OpenAPI operation or documented parameter.");
  lines.push("- Required shared client methods for central prediction, portfolio, order, settlement, taxonomy, and wallet-ledger flows are present.");
  lines.push("- This gate checks API/data surface completeness; safety, abuse, dependency, deployment, and no-money runtime proof remain Scenario 12 concerns.");
  lines.push("");
}

const output = `${lines.join("\n")}\n`;
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(reportPath, output);
fs.writeFileSync(artifactPath, output);

console.log(`Scenario 11 API surface gate: ${result}`);
console.log(`Wrote report: ${reportPath}`);
console.log(`Wrote artifact: ${artifactPath}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
NODE
