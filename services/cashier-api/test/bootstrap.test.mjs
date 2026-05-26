import assert from "node:assert/strict";
import test from "node:test";

import {
  createCashierRepositoryFromEnv,
  normalizeRepositoryBackend,
  requireCashierDatabaseUrl,
} from "../src/bootstrap.mjs";

test("repository backend aliases normalize to stable modes", () => {
  assert.equal(normalizeRepositoryBackend("pg"), "postgres");
  assert.equal(normalizeRepositoryBackend("PostgreSQL"), "postgres");
  assert.equal(normalizeRepositoryBackend("in-memory"), "memory");
  assert.equal(normalizeRepositoryBackend("memory"), "memory");
});

test("local bootstrap defaults to in-memory repository", async () => {
  const seed = {
    wallets: [
      {
        userId: "user_test",
        embeddedWalletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        smartWalletAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        settlementChain: "polygon",
      },
    ],
  };
  const { backend, repo, close } = await createCashierRepositoryFromEnv({
    env: { NODE_ENV: "test" },
    seed,
  });

  assert.equal(backend, "memory");
  assert.equal((await repo.getWalletByUserId("user_test")).settlementChain, "polygon");
  await close();
});

test("production-like envs forbid implicit in-memory cashier state", async () => {
  await assert.rejects(
    () =>
      createCashierRepositoryFromEnv({
        env: { NODE_ENV: "production", CASHIER_REPOSITORY_BACKEND: "memory" },
      }),
    /cashier_in_memory_repository_forbidden/,
  );

  await assert.doesNotReject(() =>
    createCashierRepositoryFromEnv({
      env: {
        NODE_ENV: "production",
        CASHIER_REPOSITORY_BACKEND: "memory",
        CASHIER_ALLOW_IN_MEMORY_REPOSITORY: "true",
      },
    }),
  );
});

test("postgres bootstrap accepts an injected query client", async () => {
  const client = new ScriptedClient([
    {
      match: /from cashier_wallets\s+where user_id = \$1/i,
      params: ["user_maria_001"],
      rows: [
        {
          user_id: "user_maria_001",
          embedded_wallet_address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          smart_wallet_address: "0x1111111111111111111111111111111111111111",
          settlement_chain: "polygon",
          smart_wallet_provider: "erc4337",
          created_at: "2026-05-25T00:00:00.000Z",
        },
      ],
    },
  ]);
  const { backend, repo, close } = await createCashierRepositoryFromEnv({
    env: { CASHIER_REPOSITORY_BACKEND: "postgres" },
    client,
  });

  assert.equal(backend, "postgres");
  assert.equal((await repo.getWalletByUserId("user_maria_001")).smartWalletProvider, "erc4337");
  await close();
  assert.equal(client.ended, false);
});

test("postgres bootstrap creates and closes a pg pool from env", async () => {
  const createdPools = [];
  class FakePool {
    constructor(config) {
      this.config = config;
      this.ended = false;
      createdPools.push(this);
    }
    async query() {
      return { rows: [] };
    }
    async end() {
      this.ended = true;
    }
  }

  const { backend, close } = await createCashierRepositoryFromEnv({
    env: {
      CASHIER_REPOSITORY_BACKEND: "postgres",
      CASHIER_DATABASE_URL: "postgres://cashier:cashier@localhost:5432/cashier",
      CASHIER_DATABASE_POOL_MAX: "3",
      CASHIER_DATABASE_SSL: "no-verify",
    },
    loadPg: async () => ({ Pool: FakePool }),
  });

  assert.equal(backend, "postgres");
  assert.equal(createdPools.length, 1);
  assert.equal(createdPools[0].config.max, 3);
  assert.deepEqual(createdPools[0].config.ssl, { rejectUnauthorized: false });

  await close();
  assert.equal(createdPools[0].ended, true);
});

test("postgres bootstrap requires an explicit database URL", async () => {
  assert.throws(() => requireCashierDatabaseUrl({}), /cashier_database_url_required/);
  await assert.rejects(
    () =>
      createCashierRepositoryFromEnv({
        env: { CASHIER_REPOSITORY_BACKEND: "postgres" },
        loadPg: async () => ({ Pool: class {} }),
      }),
    /cashier_database_url_required/,
  );
});

class ScriptedClient {
  constructor(responses) {
    this.responses = responses;
    this.ended = false;
  }

  async query(text, params = []) {
    const response = this.responses.shift();
    assert.ok(response, `Unexpected query: ${text}`);
    assert.match(text, response.match);
    if (response.params) {
      assert.deepEqual(params, response.params);
    }
    return { rows: response.rows ?? [] };
  }

  async end() {
    this.ended = true;
  }
}
