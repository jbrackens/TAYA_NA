/**
 * Regression tests for the alpha custodial USDC cashier frontend contract.
 *
 * Run: npx tsx --test app/__tests__/alpha-cashier.test.ts
 */
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  centsToDollars,
  dollarsToCents,
} from "../lib/api/alpha-cashier-client";

const { describe, it } = require("node:test") as {
  describe: (name: string, fn: () => void) => void;
  it: (name: string, fn: () => void) => void;
};

const clientSource = readFileSync(
  resolve(__dirname, "../lib/api/alpha-cashier-client.ts"),
  "utf-8",
);
const cardSource = readFileSync(
  resolve(__dirname, "../components/CryptoDepositCard.tsx"),
  "utf-8",
);
const cashierPageSource = readFileSync(
  resolve(__dirname, "../cashier/page.tsx"),
  "utf-8",
);

describe("alpha cashier client", () => {
  it("uses the gateway alpha cashier API namespace for player flows", () => {
    assert.ok(
      clientSource.includes('const BASE = "/api/v1/cashier/alpha"'),
      "client should be rooted at /api/v1/cashier/alpha",
    );
    assert.ok(clientSource.includes("`${BASE}/config`"));
    assert.ok(clientSource.includes("`${BASE}/wallet/challenge`"));
    assert.ok(clientSource.includes("`${BASE}/wallet/connect`"));
    assert.ok(clientSource.includes("`${BASE}/wallets`"));
    assert.ok(clientSource.includes("`${BASE}/deposit-intents`"));
    assert.ok(
      clientSource.includes("`${BASE}/deposit-intents/${intentId}/submit-tx`"),
    );
    assert.ok(clientSource.includes("`${BASE}/withdrawal-requests`"));
  });

  it("adds idempotency keys to alpha cashier mutations", () => {
    assert.ok(clientSource.includes('newIdempotencyKey("alpha-deposit")'));
    assert.ok(
      clientSource.includes('newIdempotencyKey("alpha-deposit-submit")'),
    );
    assert.ok(clientSource.includes('newIdempotencyKey("alpha-withdrawal")'));
    assert.equal(
      (clientSource.match(/"Idempotency-Key"/g) || []).length,
      3,
      "deposit, submit-tx, and withdrawal mutations should be idempotent",
    );
  });

  it("submits an ERC-20 transfer through MetaMask before reporting the tx hash", () => {
    assert.ok(clientSource.includes('method: "wallet_switchEthereumChain"'));
    assert.ok(clientSource.includes('method: "eth_sendTransaction"'));
    assert.ok(clientSource.includes("to: intent.tokenAddress"));
    assert.ok(clientSource.includes("encodeERC20TransferData("));
    assert.ok(clientSource.includes('const selector = "a9059cbb"'));
  });

  it("rounds dollars and cents consistently at the UI boundary", () => {
    assert.equal(dollarsToCents(12.345), 1235);
    assert.equal(dollarsToCents(0.01), 1);
    assert.equal(centsToDollars(1235), 12.35);
    assert.equal(centsToDollars(undefined), 0);
  });
});

describe("alpha cashier player UI", () => {
  it("loads config, wallets, deposits, and withdrawals before enabling the card", () => {
    assert.ok(cardSource.includes("getAlphaCashierConfig()"));
    assert.ok(cardSource.includes("listWalletConnections().catch(() => [])"));
    assert.ok(cardSource.includes("listDepositIntents().catch(() => [])"));
    assert.ok(cardSource.includes("listWithdrawalRequests().catch(() => [])"));
  });

  it("keeps fiat deposit/withdraw submission separate from crypto rails", () => {
    assert.ok(cashierPageSource.includes('selectedPayment === "crypto"'));
    assert.ok(
      /if \(isCryptoRail\) \{\s+return;\s+\}/.test(cashierPageSource),
      "crypto rails should bypass the fiat submit handler",
    );
    assert.ok(cashierPageSource.includes("{isCryptoRail && ("));
    assert.ok(cashierPageSource.includes("<CryptoDepositCard"));
    assert.ok(cashierPageSource.includes("{!isCryptoRail && ("));
    assert.ok(cashierPageSource.includes("<span>Tiangge fee</span>"));
    assert.ok(cashierPageSource.includes("<span>$0.00</span>"));
  });

  it("requires operator review for alpha withdrawals and refreshes balance after changes", () => {
    assert.ok(cardSource.includes("createWithdrawalRequest("));
    assert.ok(cardSource.includes("config.withdrawalsEnabled"));
    assert.ok(cardSource.includes("withdrawal requested"));
    assert.ok(cardSource.includes("pending operator review"));
    assert.ok(cardSource.includes("await onBalanceChanged()"));
  });
});
