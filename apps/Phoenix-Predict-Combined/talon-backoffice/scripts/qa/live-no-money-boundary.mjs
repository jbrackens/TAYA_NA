#!/usr/bin/env node

const prohibitedWebPaths = [
  "/cashier",
  "/cashier/cheque",
  "/cashout",
  "/crypto",
  "/deposit",
  "/deposits",
  "/fiat",
  "/payment",
  "/payments",
  "/prize",
  "/prizes",
  "/redeem",
  "/redemption",
  "/withdraw",
  "/withdrawal",
  "/withdrawals",
];

const gatewayMoneyPaths = [
  "/api/v1/cashier/alpha/config",
  "/api/v1/cashier/alpha/wallet/challenge",
  "/api/v1/cashier/alpha/wallet/connect",
  "/api/v1/cashier/alpha/wallets",
  "/api/v1/cashier/alpha/deposit-intents",
  "/api/v1/cashier/alpha/deposit-intents/intent-1/submit-tx",
  "/api/v1/cashier/alpha/withdrawal-requests",
  "/api/v1/cashier/alpha/withdrawal-requests/request-1/cancel",
  "/api/v1/admin/cashier/alpha/preflight",
  "/api/v1/admin/cashier/alpha/deposits",
  "/api/v1/admin/cashier/alpha/reconciliation",
  "/api/v1/admin/cashier/alpha/withdrawals",
  "/api/v1/admin/cashier/alpha/audit-events",
  "/api/v1/admin/cashier/alpha/withdrawals/request-1/approve",
  "/api/v1/payments/deposit",
  "/api/v1/payments/withdraw",
  "/api/v1/payments/methods",
  "/api/v1/payments/status?transactionId=dep-1",
  "/api/v1/payments/webhook",
  "/api/v1/payments/crypto/config",
  "/api/v1/payments/crypto/deposit-address",
];

const positivePaths = {
  player: ["/", "/predict", "/rewards", "/leaderboards"],
  office: ["/", "/auth/login"],
};

const requiredGatewayDomains = [
  "prediction",
  "orders",
  "point_wallet",
  "responsible_play",
  "loyalty",
  "leaderboards",
  "auth",
];

const prohibitedGatewayDomains = [
  "alpha_cashier",
  "payments",
  "crypto_payments",
];

export async function runLiveNoMoneyBoundaryProbe(config, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const surfaces = [];

  if (config.playerBaseUrl) {
    surfaces.push({
      kind: "web",
      name: "player",
      baseUrl: config.playerBaseUrl,
      positivePaths: positivePaths.player,
      prohibitedPaths: prohibitedWebPaths,
    });
  }
  if (config.officeBaseUrl) {
    surfaces.push({
      kind: "web",
      name: "office",
      baseUrl: config.officeBaseUrl,
      positivePaths: positivePaths.office,
      prohibitedPaths: prohibitedWebPaths,
    });
  }
  if (config.gatewayBaseUrl) {
    surfaces.push({
      kind: "gateway",
      name: "gateway",
      baseUrl: config.gatewayBaseUrl,
      prohibitedPaths: gatewayMoneyPaths,
    });
  }
  if (surfaces.length === 0) {
    throw new Error("set at least one of PLAYER_BASE_URL, OFFICE_BASE_URL, or GATEWAY_BASE_URL");
  }

  const checks = [];
  for (const surface of surfaces) {
    if (surface.kind === "gateway") {
      checks.push(...await probeGateway(surface, fetchImpl, timeoutMs));
    } else {
      checks.push(...await probeWebSurface(surface, fetchImpl, timeoutMs));
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    surfaces: surfaces.map(({ name, baseUrl }) => ({ name, baseUrl })),
    checks,
    failed: checks.filter((check) => !check.pass).length,
  };
}

async function probeWebSurface(surface, fetchImpl, timeoutMs) {
  const checks = [];
  for (const path of surface.positivePaths) {
    const response = await fetchWithTimeout(fetchImpl, surface.baseUrl, path, "GET", timeoutMs);
    checks.push({
      surface: surface.name,
      method: "GET",
      path,
      status: response.status,
      pass: response.status > 0 && response.status < 500,
      expectation: "page responds below 500",
      note: response.error ?? "",
    });
  }
  for (const path of surface.prohibitedPaths) {
    const response = await fetchWithTimeout(fetchImpl, surface.baseUrl, path, "GET", timeoutMs);
    checks.push({
      surface: surface.name,
      method: "GET",
      path,
      status: response.status,
      pass: response.status === 404 || response.status === 410,
      expectation: "money path is absent",
      note: response.error ?? "",
    });
  }
  return checks;
}

async function probeGateway(surface, fetchImpl, timeoutMs) {
  const checks = [];
  const status = await fetchWithTimeout(fetchImpl, surface.baseUrl, "/api/v1/status", "GET", timeoutMs);
  let payload = {};
  if (status.body) {
    try {
      payload = JSON.parse(status.body);
    } catch (error) {
      payload = { parseError: error instanceof Error ? error.message : String(error) };
    }
  }
  const domains = Array.isArray(payload.launchRouteDomains) ? payload.launchRouteDomains : [];
  checks.push({
    surface: surface.name,
    method: "GET",
    path: "/api/v1/status",
    status: status.status,
    pass: status.status === 200 && payload.pointMode === "non_redeemable_points" && payload.legacyMoneyRoutes === "disabled",
    expectation: "gateway reports point launch boundary",
    note: status.error ?? JSON.stringify({
      pointMode: payload.pointMode,
      legacyMoneyRoutes: payload.legacyMoneyRoutes,
    }),
  });
  for (const domain of requiredGatewayDomains) {
    checks.push({
      surface: surface.name,
      method: "GET",
      path: "/api/v1/status",
      status: status.status,
      pass: domains.includes(domain),
      expectation: `status includes ${domain}`,
      note: domains.join(", "),
    });
  }
  for (const domain of prohibitedGatewayDomains) {
    checks.push({
      surface: surface.name,
      method: "GET",
      path: "/api/v1/status",
      status: status.status,
      pass: !domains.includes(domain),
      expectation: `status excludes ${domain}`,
      note: domains.join(", "),
    });
  }
  for (const path of surface.prohibitedPaths) {
    const method = path.includes("deposit") || path.includes("withdraw") || path.includes("connect") || path.includes("webhook") ? "POST" : "GET";
    const response = await fetchWithTimeout(fetchImpl, surface.baseUrl, path, method, timeoutMs);
    checks.push({
      surface: surface.name,
      method,
      path,
      status: response.status,
      pass: response.status === 404 || response.status === 410,
      expectation: "gateway money path is absent",
      note: response.error ?? "",
    });
  }
  return checks;
}

async function fetchWithTimeout(fetchImpl, baseUrl, path, method, timeoutMs) {
  return fetchURLWithTimeout(fetchImpl, new URL(path, withTrailingSlash(baseUrl)), method, timeoutMs, 0);
}

async function fetchURLWithTimeout(fetchImpl, url, method, timeoutMs, redirectCount) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method,
      redirect: "manual",
      signal: controller.signal,
    });
    if (isRedirect(response.status) && redirectCount < 3) {
      const location = response.headers.get("location");
      if (location) {
        const nextURL = new URL(location, url);
        if (nextURL.origin === url.origin) {
          clearTimeout(timeout);
          return fetchURLWithTimeout(fetchImpl, nextURL, method, timeoutMs, redirectCount + 1);
        }
      }
    }
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") || contentType.includes("text/")
      ? await response.text()
      : "";
    return { status: response.status, body };
  } catch (error) {
    return {
      status: 0,
      body: "",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isRedirect(status) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function withTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

export function renderMarkdownReport(report) {
  const lines = [
    "# Live No-Money Boundary Report",
    "",
    `- Generated: \`${report.generatedAt}\``,
    `- Surfaces: ${report.surfaces.map((surface) => `\`${surface.name}\``).join(", ")}`,
    `- Checks: ${report.checks.length}`,
    `- Failures: ${report.failed}`,
    "",
    "| Surface | Method | Path | Status | Expectation | Result |",
    "|---|---|---|---:|---|---:|",
  ];
  for (const check of report.checks) {
    lines.push([
      check.surface,
      check.method,
      `\`${check.path}\``,
      String(check.status),
      check.expectation,
      check.pass ? "Pass" : "Fail",
    ].join(" | "));
  }
  return `${lines.join("\n")}\n`;
}

function configFromEnv(env) {
  return {
    playerBaseUrl: env.PLAYER_BASE_URL || env.PREDICT_PLAYER_BASE_URL || "",
    officeBaseUrl: env.OFFICE_BASE_URL || env.PREDICT_OFFICE_BASE_URL || "",
    gatewayBaseUrl: env.GATEWAY_BASE_URL || env.PREDICT_GATEWAY_BASE_URL || "",
  };
}

async function main() {
  const report = await runLiveNoMoneyBoundaryProbe(configFromEnv(process.env));
  process.stdout.write(renderMarkdownReport(report));
  if (report.failed > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
