import assert from "node:assert/strict";

const apiKey = process.env.TRONGRID_API_KEY;
const baseUrl = process.env.TRONGRID_BASE_URL ?? "https://api.trongrid.io";
const usdtContract =
  process.env.TRON_USDT_CONTRACT_HEX ?? "41a614f803b6fd780986a42c78ec9c7f77e6ded13c";
const ownerAddress =
  process.env.TRON_SMOKE_OWNER_HEX ?? "410000000000000000000000000000000000000000";

if (!apiKey) {
  console.error("TRONGRID_API_KEY is required for TronGrid smoke checks");
  process.exit(2);
}

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "TRON-PRO-API-KEY": apiKey,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  assert.equal(response.ok, true, `${path} returned ${response.status}: ${text}`);
  return parsed;
}

const block = await post("/wallet/getnowblock", {});
assert.equal(typeof block?.block_header?.raw_data?.number, "number");
assert.equal(typeof block?.blockID, "string");

const decimals = await post("/wallet/triggerconstantcontract", {
  owner_address: ownerAddress,
  contract_address: usdtContract,
  function_selector: "decimals()",
  parameter: "",
});

assert.equal(decimals?.result?.result, true, "USDT decimals call failed");
const rawDecimals = decimals?.constant_result?.[0];
assert.equal(rawDecimals, "0000000000000000000000000000000000000000000000000000000000000006");

console.log(
  JSON.stringify(
    {
      status: "ok",
      network: baseUrl,
      blockNumber: block.block_header.raw_data.number,
      blockId: block.blockID,
      usdtContract,
      usdtDecimals: 6,
    },
    null,
    2,
  ),
);
