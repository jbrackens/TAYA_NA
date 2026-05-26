import { createInMemoryCashierRepository } from "./repository.mjs";
import { createSqlCashierRepository } from "./sql-repository.mjs";

const POSTGRES_BACKENDS = new Set(["postgres", "postgresql", "pg", "sql"]);
const MEMORY_BACKENDS = new Set(["memory", "in-memory", "in_memory"]);
const DEFAULT_POOL_MAX = 10;

export async function createCashierRepositoryFromEnv(options = {}) {
  const env = options.env ?? process.env;
  const backend = normalizeRepositoryBackend(
    env.CASHIER_REPOSITORY_BACKEND ?? inferRepositoryBackend(env),
  );

  if (backend === "memory") {
    assertInMemoryAllowed(env);
    return {
      backend,
      repo: createInMemoryCashierRepository(options.seed),
      close: async () => {},
    };
  }

  if (backend === "postgres") {
    const client = options.client ?? options.pool ?? (await createPostgresPool(env, options.loadPg));
    const ownsClient = !options.client && !options.pool;
    return {
      backend,
      repo: createSqlCashierRepository(client),
      close: ownsClient && typeof client.end === "function" ? () => client.end() : async () => {},
    };
  }

  throw new Error(`unsupported_cashier_repository_backend:${backend}`);
}

export function normalizeRepositoryBackend(value) {
  const backend = String(value ?? "").trim().toLowerCase();
  if (POSTGRES_BACKENDS.has(backend)) return "postgres";
  if (MEMORY_BACKENDS.has(backend)) return "memory";
  return backend;
}

export function requireCashierDatabaseUrl(env = process.env) {
  const databaseUrl = env.CASHIER_DATABASE_URL ?? env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("cashier_database_url_required");
  }
  return databaseUrl;
}

function inferRepositoryBackend(env) {
  return env.CASHIER_DATABASE_URL || env.DATABASE_URL ? "postgres" : "memory";
}

function assertInMemoryAllowed(env) {
  if (!isProductionLike(env)) {
    return;
  }
  if (env.CASHIER_ALLOW_IN_MEMORY_REPOSITORY === "true") {
    return;
  }
  throw new Error("cashier_in_memory_repository_forbidden");
}

function isProductionLike(env) {
  return ["production", "staging", "preview"].includes(
    String(env.NODE_ENV ?? env.DEPLOY_ENV ?? env.VERCEL_ENV ?? "").toLowerCase(),
  );
}

async function createPostgresPool(env, loadPg = defaultLoadPg) {
  const databaseUrl = requireCashierDatabaseUrl(env);
  const pg = await loadPg();
  const Pool = pg.Pool ?? pg.default?.Pool;
  if (typeof Pool !== "function") {
    throw new Error("pg_pool_unavailable");
  }
  return new Pool({
    connectionString: databaseUrl,
    max: parsePositiveInteger(env.CASHIER_DATABASE_POOL_MAX, DEFAULT_POOL_MAX),
    ssl: parseSsl(env),
  });
}

async function defaultLoadPg() {
  return import("pg");
}

function parsePositiveInteger(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseSsl(env) {
  const mode = String(env.CASHIER_DATABASE_SSL ?? env.PGSSLMODE ?? "").toLowerCase();
  if (!mode || mode === "disable" || mode === "false") {
    return false;
  }
  if (mode === "require" || mode === "true") {
    return { rejectUnauthorized: true };
  }
  if (mode === "no-verify") {
    return { rejectUnauthorized: false };
  }
  return false;
}
