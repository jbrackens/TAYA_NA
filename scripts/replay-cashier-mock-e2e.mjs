import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyBridgeEventToDepositIntent,
  assertValidRelayerSubmission,
  assertValidWithdrawalIntent,
  createRecoveryCaseFromBridgeEvent,
  evaluateCashierCompliancePolicy,
  evaluateRelayerPolicy,
} from "../packages/cashier-sdk/.tmp-test-dist/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

const initialDeposit = readJson("services/cashier-api/fixtures/deposit-intent.created.json");
const sourceEvent = readJson("services/bridge-watcher/fixtures/relay-source-detected.json");
const destinationEvent = readJson(
  "services/bridge-watcher/fixtures/relay-destination-confirmed.json",
);
const mismatchEvent = readJson(
  "services/bridge-watcher/fixtures/relay-quarantined-destination-mismatch.json",
);
const withdrawal = readJson("services/cashier-api/fixtures/withdrawal-intent.created.json");
const relayerSubmission = readJson("services/relayer/fixtures/policy-approved-withdrawal.json");

const depositCompliance = evaluateCashierCompliancePolicy({
  subjectType: "deposit",
  amount: sourceEvent.amount,
  perTransactionCapUnits: "100000000",
  dailyAggregateUnits: "0",
  dailyCapUnits: "500000000",
  geoAllowed: true,
  addressScreening: "clear",
});

const detected = applyBridgeEventToDepositIntent(
  initialDeposit,
  sourceEvent,
  "2026-05-25T00:05:01.000Z",
);
const bridging = applyBridgeEventToDepositIntent(
  detected,
  destinationEvent,
  "2026-05-25T00:08:01.000Z",
);
const settled = applyBridgeEventToDepositIntent(
  bridging,
  destinationEvent,
  "2026-05-25T00:08:02.000Z",
);
const recoveryCase = createRecoveryCaseFromBridgeEvent({
  id: "rec_generated_001",
  intent: initialDeposit,
  event: mismatchEvent,
  openedAt: "2026-05-25T00:09:31.000Z",
});

assertValidWithdrawalIntent(withdrawal);
assertValidRelayerSubmission(relayerSubmission);
const policy = evaluateRelayerPolicy({
  submission: relayerSubmission,
  complianceDecision: { decision: "allow" },
  allowedTargets: [relayerSubmission.targetContract],
  allowedSelectors: ["0xa9059cbb"],
  calldataSelector: "0xa9059cbb",
  amount: withdrawal.amount,
  maxAmountUnits: withdrawal.amount.units,
  paymasterRunwaySeconds: 3600,
  minPaymasterRunwaySeconds: 600,
  alreadySubmittedOrIncluded: false,
  now: "2026-05-25T00:20:00.000Z",
});

console.log(
  JSON.stringify(
    {
      depositStatusPath: [
        initialDeposit.status,
        detected.status,
        bridging.status,
        settled.status,
      ],
      settledAmount: settled.settledAmount,
      recoveryCase: {
        id: recoveryCase.id,
        status: recoveryCase.status,
        reason: recoveryCase.recoveryReason,
      },
      depositCompliance,
      withdrawalStatus: withdrawal.status,
      relayerPolicy: policy,
    },
    null,
    2,
  ),
);
