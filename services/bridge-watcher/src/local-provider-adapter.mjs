import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function createLocalProviderAdapter({ rootDir, now = () => new Date().toISOString() }) {
  const root = rootDir ?? resolve(new URL("../../..", import.meta.url).pathname);

  return {
    async createDepositRoute(request) {
      if (request.rail === "tron-usdt-deposit-address") {
        return {
          depositIntentId: "dep_local_tron_001",
          provider: "relay",
          providerRequestId: "relay_local_req_001",
          sourceChain: "tron",
          sourceAsset: "USDT",
          sourceDecimals: 6,
          settlementAsset: "hUSD",
          depositAddress: "TLocalMockDepositAddress111111111111111",
          createdAt: request.now ?? now(),
        };
      }
      return {
        depositIntentId: "dep_local_evm_001",
        provider: "manual",
        providerRequestId: "manual_direct_evm_001",
        sourceChain: request.settlementChain,
        sourceAsset: request.settlementChain === "bsc" ? "USDT" : "USDC",
        sourceDecimals: request.settlementChain === "bsc" ? 18 : 6,
        settlementAsset: request.settlementChain === "bsc" ? "USDT" : "USDC",
        createdAt: request.now ?? now(),
      };
    },

    async getProviderRequest(providerRequestId) {
      if (providerRequestId === "relay_req_test_001" || providerRequestId === "relay_local_req_001") {
        return {
          provider: "relay",
          providerRequestId,
          status: "destination_confirmed",
          events: [
            readJson(root, "services/bridge-watcher/fixtures/relay-source-detected.json"),
            readJson(root, "services/bridge-watcher/fixtures/relay-destination-confirmed.json"),
          ],
        };
      }
      return {
        provider: "relay",
        providerRequestId,
        status: "quarantined",
        events: [readJson(root, "services/bridge-watcher/fixtures/relay-quarantined-unknown-request.json")],
      };
    },

    async normalizeCallback(scenario = "signed-callback-source-confirmed") {
      const manifest = readJson(root, "services/bridge-watcher/fixtures/provider-scenarios.manifest.json");
      const entry = manifest.scenarios.find((candidate) => candidate.id === scenario);
      if (!entry || entry.securityLogOnly) {
        return [];
      }
      return [readJson(root, `services/bridge-watcher/fixtures/${entry.eventFixture}`)];
    },
  };
}

function readJson(root, path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}
