import http from "node:http";
import test from "node:test";
import assert from "node:assert/strict";

import {
  renderMarkdownReport,
  runLiveNoMoneyBoundaryProbe,
} from "./live-no-money-boundary.mjs";

test("live no-money boundary probe passes absent money paths across surfaces", async () => {
  await withMockServer((req, res) => {
    if (req.url === "/api/v1/status") {
      writeJSON(res, 200, {
        pointMode: "non_redeemable_points",
        legacyMoneyRoutes: "disabled",
        launchRouteDomains: [
          "prediction",
          "orders",
          "point_wallet",
          "responsible_play",
          "loyalty",
          "leaderboards",
          "auth",
        ],
      });
      return;
    }
    if (isProhibitedPath(req.url ?? "")) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": "text/plain" }).end("TapTrade points");
  }, async (baseUrl) => {
    const report = await runLiveNoMoneyBoundaryProbe({
      playerBaseUrl: baseUrl,
      officeBaseUrl: baseUrl,
      gatewayBaseUrl: baseUrl,
    });
    assert.equal(report.failed, 0);
    assert.match(renderMarkdownReport(report), /Live No-Money Boundary Report/);
  });
});

test("live no-money boundary probe fails exposed money routes and unsafe status", async () => {
  await withMockServer((req, res) => {
    if (req.url === "/api/v1/status") {
      writeJSON(res, 200, {
        pointMode: "cash_equivalent",
        legacyMoneyRoutes: "enabled",
        launchRouteDomains: ["prediction", "alpha_cashier", "payments"],
      });
      return;
    }
    if (req.url === "/cashier" || req.url === "/api/v1/payments/deposit") {
      res.writeHead(200, { "content-type": "text/plain" }).end("money route");
      return;
    }
    if (isProhibitedPath(req.url ?? "")) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": "text/plain" }).end("TapTrade points");
  }, async (baseUrl) => {
    const report = await runLiveNoMoneyBoundaryProbe({
      playerBaseUrl: baseUrl,
      gatewayBaseUrl: baseUrl,
    });
    assert.ok(report.failed >= 3, `expected multiple failures, got ${report.failed}`);
    const markdown = renderMarkdownReport(report);
    assert.match(markdown, /cashier/);
    assert.match(markdown, /Fail/);
  });
});

async function withMockServer(handler, callback) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

function isProhibitedPath(rawPath) {
  const path = rawPath.split("?")[0];
  return /(^|\/)(cashier|cashout|crypto|deposit|deposits|fiat|payment|payments|prize|prizes|redeem|redemption|withdraw|withdrawal|withdrawals)(\/|$)/.test(path);
}

function writeJSON(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}
