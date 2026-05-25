import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";

const fixturesDir = new URL("../services/bridge-watcher/fixtures/", import.meta.url);
const manifest = JSON.parse(
  readFileSync(new URL("provider-scenarios.manifest.json", fixturesDir), "utf8"),
);

assert.ok(Array.isArray(manifest.scenarios), "provider scenarios must be an array");
assert.ok(
  manifest.scenarios.length >= 10,
  "provider adapter manifest must cover at least ten scenarios",
);

const ids = new Set();
const eventsByScenario = new Map();
for (const scenario of manifest.scenarios) {
  assert.match(scenario.id, /^[a-z0-9-]+$/, "scenario ids must be stable slugs");
  assert.ok(!ids.has(scenario.id), `duplicate provider scenario: ${scenario.id}`);
  ids.add(scenario.id);
  assert.ok(scenario.description, `${scenario.id} must include a description`);
  if (scenario.securityLogOnly) {
    assert.equal(
      scenario.eventFixture,
      undefined,
      `${scenario.id} must not create a bridge event fixture`,
    );
    continue;
  }
  assert.ok(scenario.eventFixture, `${scenario.id} must name an event fixture`);
  assert.ok(
    existsSync(new URL(scenario.eventFixture, fixturesDir)),
    `${scenario.id} fixture does not exist: ${scenario.eventFixture}`,
  );
  eventsByScenario.set(
    scenario.id,
    JSON.parse(readFileSync(new URL(scenario.eventFixture, fixturesDir), "utf8")),
  );
}

for (const required of [
  "duplicate-callback-replay",
  "invalid-callback-signature",
  "unknown-provider-request",
  "under-minimum-source-amount",
  "expired-quote-late-source",
  "destination-wallet-mismatch",
  "provider-failed-after-source",
  "missing-destination-evidence",
  "sanctions-manual-review",
]) {
  assert.ok(ids.has(required), `missing provider scenario: ${required}`);
}

const semanticChecks = {
  "signed-callback-source-confirmed": (event) => {
    assert.equal(event.status, "source_confirmed");
    assert.ok(event.callbackVerification, "signed callback fixture must include callback verification evidence");
    assert.match(event.callbackVerification.envelope.rawBodySha256, /^[a-fA-F0-9]{64}$/);
  },
  "duplicate-callback-replay": (event) => {
    assert.equal(event.status, "ignored_duplicate");
    assert.equal(event.idempotencyKey, "deposit:relay:tron:tron_tx_test_001:0");
  },
  "unknown-provider-request": (event) => {
    assert.equal(event.status, "quarantined");
    assert.equal(event.depositIntentId, undefined);
    assert.equal(event.recoveryReason, "ambiguous_source");
  },
  "under-minimum-source-amount": (event) => {
    assert.equal(event.status, "quarantined");
    assert.equal(event.recoveryReason, "under_minimum");
  },
  "expired-quote-late-source": (event) => {
    assert.equal(event.status, "quarantined");
    assert.equal(event.recoveryReason, "expired_quote");
  },
  "destination-wallet-mismatch": (event) => {
    assert.equal(event.status, "quarantined");
    assert.notEqual(
      event.destinationWalletAddress,
      "0x1111111111111111111111111111111111111111",
    );
  },
  "provider-failed-after-source": (event) => {
    assert.equal(event.status, "failed");
    assert.equal(event.recoveryReason, "provider_failed");
  },
  "missing-destination-evidence": (event) => {
    assert.equal(event.status, "quarantined");
    assert.equal(event.destinationTxHash, undefined);
  },
  "sanctions-manual-review": (event) => {
    assert.equal(event.status, "quarantined");
    assert.equal(event.recoveryReason, "sanctions_review");
  },
};

for (const [scenarioId, check] of Object.entries(semanticChecks)) {
  const event = eventsByScenario.get(scenarioId);
  assert.ok(event, `missing semantic-check fixture for ${scenarioId}`);
  check(event);
}

console.log("cashier provider scenario checks passed");
