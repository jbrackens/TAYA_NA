/**
 * Regression test: wallet-client.ts endpoint paths
 * Verifies the points-only wallet client does not expose payment helpers.
 *
 * Run: npx tsx --test app/__tests__/wallet-paths.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const clientPath = resolve(__dirname, "../lib/api/wallet-client.ts");
const bonusClientPath = resolve(__dirname, "../lib/api/bonus-client.ts");
const bonusSlicePath = resolve(__dirname, "../lib/store/bonusSlice.ts");
const rewardsPagePath = resolve(__dirname, "../rewards/page.tsx");
const activeBonusesControlPath = resolve(
  __dirname,
  "../rewards/ActiveBonusesControl.tsx",
);
const walletBreakdownPath = resolve(
  __dirname,
  "../components/WalletBreakdown.tsx",
);
const wageringProgressPath = resolve(
  __dirname,
  "../components/WageringProgress.tsx",
);
const apiIndexPath = resolve(__dirname, "../lib/api/index.ts");
const sharedApiTypesPath = resolve(
  __dirname,
  "../../../api-client/src/types.ts",
);
const sharedApiClientPath = resolve(
  __dirname,
  "../../../api-client/src/client.ts",
);
const sharedApiPredictionTypesPath = resolve(
  __dirname,
  "../../../api-client/src/prediction-types.ts",
);
const sharedApiIndexPath = resolve(
  __dirname,
  "../../../api-client/src/index.ts",
);
const source = readFileSync(clientPath, "utf-8");
const bonusSource = readFileSync(bonusClientPath, "utf-8");
const bonusSliceSource = readFileSync(bonusSlicePath, "utf-8");
const rewardsPageSource = readFileSync(rewardsPagePath, "utf-8");
const activeBonusesControlSource = readFileSync(
  activeBonusesControlPath,
  "utf-8",
);
const walletBreakdownSource = readFileSync(walletBreakdownPath, "utf-8");
const wageringProgressSource = readFileSync(wageringProgressPath, "utf-8");
const apiIndexSource = readFileSync(apiIndexPath, "utf-8");
const sharedApiTypesSource = readFileSync(sharedApiTypesPath, "utf-8");
const sharedApiClientSource = readFileSync(sharedApiClientPath, "utf-8");
const sharedApiPredictionTypesSource = readFileSync(
  sharedApiPredictionTypesPath,
  "utf-8",
);
const sharedApiIndexSource = readFileSync(sharedApiIndexPath, "utf-8");

function sliceBetween(
  sourceText: string,
  startToken: string,
  endToken: string,
): string {
  const start = sourceText.indexOf(startToken);
  const end = sourceText.indexOf(endToken, start + startToken.length);
  assert.notEqual(start, -1, `missing start token ${startToken}`);
  assert.notEqual(end, -1, `missing end token ${endToken}`);
  return sourceText.slice(start, end);
}

describe("wallet-client endpoint paths", () => {
  it("does not expose payment helpers from the points-only wallet client", () => {
    assert.ok(
      !/export async function (deposit|withdraw|getTransactionStatus)\b/.test(
        source,
      ),
      "wallet-client should not expose payment mutation helpers",
    );
    assert.ok(
      !source.includes("/api/v1/payments/deposit") &&
        !source.includes("/api/v1/payments/withdraw") &&
        !source.includes("/api/v1/payments/status"),
      "wallet-client should not reference payment endpoints",
    );
    assert.ok(
      !/\b(deposit|withdraw)\b/.test(
        apiIndexSource.match(
          /\/\/ Wallet client[\s\S]*?from "\.\/wallet-client";/,
        )?.[0] || "",
      ),
      "API barrel should not re-export payment helpers from wallet-client",
    );
  });

  it("getBalance still calls /wallet/{userId} (correct primary path)", () => {
    assert.ok(
      source.includes("/api/v1/wallet/"),
      "getBalance should use /api/v1/wallet/ primary path",
    );
  });

  it("getTransactions still calls /wallet/{userId}/ledger (correct primary path)", () => {
    assert.ok(
      source.includes("/ledger"),
      "getTransactions should use /wallet/{userId}/ledger path",
    );
  });

  it("claimDailyPoints calls the ledger-backed daily claim endpoint", () => {
    assert.ok(
      source.includes("export async function claimDailyPoints"),
      "wallet-client should expose the daily gameplay point claim helper",
    );
    assert.ok(
      source.includes("/api/v1/wallet/daily-claim"),
      "daily claim should use the gateway wallet daily-claim endpoint",
    );
  });

  it("point pack helpers call the ledger-backed point-pack endpoints", () => {
    assert.ok(
      source.includes("export async function getPointPacks"),
      "wallet-client should expose point pack listing",
    );
    assert.ok(
      source.includes("export async function claimPointPack"),
      "wallet-client should expose point pack claiming",
    );
    assert.ok(
      source.includes("/api/v1/wallet/point-packs") &&
        source.includes("/api/v1/wallet/point-packs/claim"),
      "point packs should use the gateway wallet point-pack endpoints",
    );
  });

  it("mission helpers call the ledger-backed mission endpoints", () => {
    assert.ok(
      source.includes("export async function getMissions"),
      "wallet-client should expose mission listing",
    );
    assert.ok(
      source.includes("export async function claimMission"),
      "wallet-client should expose mission claiming",
    );
    assert.ok(
      source.includes("/api/v1/wallet/missions") &&
        source.includes("/api/v1/wallet/missions/claim"),
      "missions should use the gateway wallet mission endpoints",
    );
  });

  it("streak helpers call the ledger-backed streak endpoints", () => {
    assert.ok(
      source.includes("export async function getStreaks"),
      "wallet-client should expose streak listing",
    );
    assert.ok(
      source.includes("export async function claimStreak"),
      "wallet-client should expose streak claiming",
    );
    assert.ok(
      source.includes("/api/v1/wallet/streaks") &&
        source.includes("/api/v1/wallet/streaks/claim"),
      "streaks should use the gateway wallet streak endpoints",
    );
  });

  it("badge helpers call the ledger-backed badge endpoint", () => {
    assert.ok(
      source.includes("export async function getBadges"),
      "wallet-client should expose badge listing",
    );
    assert.ok(
      source.includes("/api/v1/wallet/badges"),
      "badges should use the gateway wallet badge endpoint",
    );
  });

  it("reward limit helper calls the ledger-backed reward-limit endpoint", () => {
    assert.ok(
      source.includes("export async function getRewardLimitStatus"),
      "wallet-client should expose reward limit status",
    );
    assert.ok(
      source.includes("/api/v1/wallet/reward-limits"),
      "reward limits should use the gateway wallet reward-limit endpoint",
    );
  });

  it("getTransactions preserves gateway ledger movement types", () => {
    assert.ok(
      !source.includes('return "deposit"') &&
        !source.includes("return 'deposit'") &&
        !source.includes('return "withdrawal"') &&
        !source.includes("return 'withdrawal'"),
      "wallet ledger credit/debit values should not be remapped to deposit/withdrawal",
    );
    assert.ok(
      source.includes("type: item.type"),
      "normalized transactions should preserve the gateway ledger type",
    );
  });

  it("getTransactions preserves ledger idempotency metadata for order review", () => {
    assert.ok(
      source.includes("idempotencyKey?: string"),
      "normalized transactions should expose optional idempotencyKey",
    );
    assert.ok(
      source.includes("idempotencyKey: item.idempotencyKey"),
      "wallet-client should preserve gateway ledger idempotency keys",
    );
  });

  it("normalizes wallet amounts as gameplay points, not USD currency", () => {
    const balanceType = sliceBetween(
      source,
      "export interface Balance {",
      "export interface Transaction",
    );
    const transactionType = sliceBetween(
      source,
      "export interface Transaction {",
      "export interface GetTransactionsPaginatedResponse",
    );
    assert.ok(
      source.includes('const POINT_UNIT = "PTS"'),
      "wallet-client should expose a point unit for normalized balances",
    );
    assert.ok(
      source.includes("unit: raw.unit || POINT_UNIT") &&
        source.includes("unit: POINT_UNIT") &&
        source.includes("unit: item.unit || POINT_UNIT"),
      "wallet balance and ledger transactions should normalize to the point unit",
    );
    assert.ok(
      !balanceType.includes("currency: string") &&
        !transactionType.includes("currency: string"),
      "wallet balance and ledger exports should expose unit instead of currency",
    );
    assert.ok(
      !source.includes('currency: "USD"') &&
        !source.includes("currency: 'USD'") &&
        !source.includes("centsToDollars"),
      "wallet-client should not label point balances as USD or dollars",
    );
  });

  it("prefers point-native wallet response aliases over legacy cents fields", () => {
    const balanceType = sliceBetween(
      source,
      "interface WalletBalanceRaw",
      "interface LegacyWalletBalanceRaw",
    );
    const ledgerType = sliceBetween(
      source,
      "interface WalletLedgerEntryRaw",
      "interface LegacyWalletLedgerEntryRaw",
    );
    const balanceNormalizer = sliceBetween(
      source,
      "export async function getBalance",
      "/**\n * Get transaction history",
    );
    const transactionNormalizer = sliceBetween(
      source,
      "export async function getTransactions",
      "interface StarterGrantResult",
    );
    for (const token of [
      "balancePointsCents",
      "availablePointsCents",
      "reservedPointsCents",
      "amountPointsCents",
      "raw.unit || POINT_UNIT",
      "item.unit || POINT_UNIT",
    ]) {
      assert.ok(
        source.includes(token),
        `wallet-client should read point-native response field ${token}`,
      );
    }
    assert.ok(
      !balanceType.includes("balanceCents") &&
        !balanceType.includes("availableCents") &&
        !balanceType.includes("reservedCents"),
      "WalletBalanceRaw should not model retired balance aliases",
    );
    assert.ok(
      !ledgerType.includes("amountCents") &&
        !ledgerType.includes("balanceCents"),
      "WalletLedgerEntryRaw should not model retired ledger aliases",
    );
    assert.ok(
      source.includes("interface LegacyWalletBalanceRaw") &&
        source.includes("interface LegacyWalletLedgerEntryRaw") &&
        balanceNormalizer.includes("legacyRaw.balanceCents") &&
        transactionNormalizer.includes("item.amountCents") &&
        transactionNormalizer.includes("item.balanceCents"),
      "old wallet payload fields should be private compatibility fallbacks only",
    );
  });

  it("keeps shared API-client wallet exports point-native", () => {
    const sharedWalletBalanceType = sliceBetween(
      sharedApiTypesSource,
      "export interface WalletBalance {",
      "export interface WalletLedgerEntry",
    );
    const sharedWalletLedgerType = sliceBetween(
      sharedApiTypesSource,
      "export interface WalletLedgerEntry {",
      "export interface WalletMutationResponse",
    );
    const sharedWalletMutationResponseType = sliceBetween(
      sharedApiTypesSource,
      "export interface WalletMutationResponse {",
      "export interface AuditLogEntry",
    );
    const sharedWalletMutationRequestType = sliceBetween(
      sharedApiTypesSource,
      "export interface WalletMutationRequest {",
      "// Pagination options",
    );

    for (const exportedType of [
      sharedWalletBalanceType,
      sharedWalletLedgerType,
      sharedWalletMutationResponseType,
      sharedWalletMutationRequestType,
    ]) {
      assert.ok(
        !exportedType.includes("amountCents") &&
          !exportedType.includes("balanceCents") &&
          !exportedType.includes("availableCents") &&
          !exportedType.includes("reservedCents"),
        "shared API-client wallet exports should not expose retired cent aliases",
      );
    }
    for (const token of [
      "balancePointsCents",
      "amountPointsCents",
      "availablePointsCents",
      "reservedPointsCents",
      "unit: 'PTS'",
    ]) {
      assert.ok(
        sharedApiTypesSource.includes(token),
        `shared API-client wallet types should expose ${token}`,
      );
    }
    assert.ok(
      sharedApiClientSource.includes("interface LegacyWalletBalancePayload") &&
        sharedApiClientSource.includes("payload.balanceCents") &&
        sharedApiClientSource.includes("payload.amountCents"),
      "shared API client should keep retired cent fields only as private compatibility reads",
    );
  });

  it("keeps shared API-client audit-log exports point-native", () => {
    const sharedAuditLogType = sliceBetween(
      sharedApiTypesSource,
      "export interface AuditLogEntry {",
      "// Request types",
    );

    for (const retired of ["freebetId", "oddsBoostId", "freebetAppliedCents"]) {
      assert.ok(
        !sharedAuditLogType.includes(retired),
        `shared AuditLogEntry should not export retired promo field ${retired}`,
      );
    }
    for (const token of [
      "pointGrantId",
      "pointRuleId",
      "pointGrantAppliedPointsCents",
    ]) {
      assert.ok(
        sharedAuditLogType.includes(token),
        `shared AuditLogEntry should expose ${token}`,
      );
    }
    assert.ok(
      sharedApiClientSource.includes("interface LegacyAuditLogEntryPayload") &&
        sharedApiClientSource.includes("payload.freebetId") &&
        sharedApiClientSource.includes("payload.oddsBoostId") &&
        sharedApiClientSource.includes("payload.freebetAppliedCents") &&
        sharedApiClientSource.includes("normalizeAuditLogEntry"),
      "shared API client should keep retired promo fields only as private audit-log compatibility reads",
    );
  });

  it("keeps shared API-client order-book hints point-native", () => {
    const orderBookHintType = sliceBetween(
      sharedApiPredictionTypesSource,
      "export interface OrderBookHint {",
      "export interface PlaceOrderResponse",
    );

    for (const retired of [
      "bestYesBidCents",
      "bestYesAskCents",
      "bestNoBidCents",
      "bestNoAskCents",
    ]) {
      assert.ok(
        !orderBookHintType.includes(retired),
        `OrderBookHint should not export retired best-quote alias ${retired}`,
      );
    }
    for (const token of [
      "bestYesBidPointsCents",
      "bestYesAskPointsCents",
      "bestNoBidPointsCents",
      "bestNoAskPointsCents",
      'unit?: "PTS" | string',
    ]) {
      assert.ok(
        orderBookHintType.includes(token),
        `OrderBookHint should expose ${token}`,
      );
    }
    assert.ok(
      !sharedApiIndexSource.includes("sportsbook"),
      "shared API-client entrypoint docs should not describe launch exports as sportsbook contracts",
    );
  });

  it("exposes a Tiangge-named shared API-client alias", () => {
    assert.ok(
      sharedApiClientSource.includes(
        "export const TianggeApiClient = PhoenixApiClient",
      ) &&
        sharedApiClientSource.includes(
          "export type TianggeApiClient = PhoenixApiClient",
        ) &&
        sharedApiIndexSource.includes(
          "export { PhoenixApiClient, TianggeApiClient } from",
        ),
      "shared API client should expose a Tiangge-named alias while preserving the inherited class for compatibility",
    );
  });

  it("prefers point-native reward response aliases over legacy cents fields", () => {
    const starterGrantType = sliceBetween(
      source,
      "interface StarterGrantResult",
      "interface StarterGrantResultRaw",
    );
    const dailyClaimType = sliceBetween(
      source,
      "export interface DailyClaimResult",
      "interface DailyClaimResultRaw",
    );
    const pointPackType = sliceBetween(
      source,
      "export interface PointPack",
      "interface PointPackRaw",
    );
    const pointPackClaimType = sliceBetween(
      source,
      "export interface PointPackClaimResult",
      "interface PointPackClaimResultRaw",
    );
    const missionType = sliceBetween(
      source,
      "export interface Mission",
      "interface MissionRaw",
    );
    const missionClaimType = sliceBetween(
      source,
      "export interface MissionClaimResult",
      "interface MissionClaimResultRaw",
    );
    const streakType = sliceBetween(
      source,
      "export interface Streak",
      "interface StreakRaw",
    );
    const streakClaimType = sliceBetween(
      source,
      "export interface StreakClaimResult",
      "interface StreakClaimResultRaw",
    );
    const rewardLimitType = sliceBetween(
      source,
      "export interface RewardLimitStatus",
      "interface RewardLimitStatusRaw",
    );
    for (const token of [
      "grantPointsCents",
      "claimPointsCents",
      "balancePointsCents",
      "amountPointsCents",
      "rewardPointsCents",
      "limitPointsCents",
      "grantedPointsCents",
      "remainingPointsCents",
      "normalizeRewardLimit",
      "normalizeRewardClaim",
      "normalizePointPack",
      "normalizeMission",
      "normalizeStreak",
    ]) {
      assert.ok(
        source.includes(token),
        `wallet-client should read point-native reward field ${token}`,
      );
    }
    for (const [label, typeSource, retired] of [
      ["StarterGrantResult", starterGrantType, ["grantCents", "balanceCents"]],
      ["DailyClaimResult", dailyClaimType, ["claimCents", "balanceCents"]],
      ["PointPack", pointPackType, ["amountCents"]],
      [
        "PointPackClaimResult",
        pointPackClaimType,
        ["claimCents", "balanceCents"],
      ],
      ["Mission", missionType, ["rewardCents"]],
      ["MissionClaimResult", missionClaimType, ["claimCents", "balanceCents"]],
      ["Streak", streakType, ["rewardCents"]],
      ["StreakClaimResult", streakClaimType, ["claimCents", "balanceCents"]],
      [
        "RewardLimitStatus",
        rewardLimitType,
        ["limitCents", "grantedCents", "remainingCents"],
      ],
    ] as const) {
      for (const token of retired) {
        assert.ok(
          !typeSource.includes(token),
          `${label} should not expose retired reward alias ${token}`,
        );
      }
    }
    assert.ok(
      source.includes("interface StarterGrantResultRaw") &&
        source.includes("interface DailyClaimResultRaw") &&
        source.includes("interface PointPackRaw") &&
        source.includes("interface MissionRaw") &&
        source.includes("interface StreakRaw") &&
        source.includes("interface RewardLimitStatusRaw") &&
        source.includes("result.claimPointsCents ?? result.claimCents") &&
        source.includes("pack.amountPointsCents ?? pack.amountCents") &&
        source.includes("mission.rewardPointsCents ?? mission.rewardCents") &&
        source.includes("status.limitPointsCents ?? status.limitCents"),
      "old reward payload fields should be private compatibility fallbacks only",
    );
  });

  it("normalizes wallet breakdown as points, not USD or real-money display fields", () => {
    const breakdownType = sliceBetween(
      bonusSource,
      "export interface WalletBreakdown",
      "export interface PlayContribution",
    );
    const breakdownState = sliceBetween(
      bonusSliceSource,
      "interface WalletBreakdown",
      "interface ActiveBonus",
    );
    const breakdownNormalizer = sliceBetween(
      bonusSource,
      "export async function getWalletBreakdown",
      "export function invalidateBonusCaches",
    );
    for (const token of [
      "basePointsCents",
      "bonusPointsCents",
      "totalPointsCents",
      'unit: res.unit || res.currency || "PTS"',
    ]) {
      assert.ok(
        bonusSource.includes(token),
        `bonus-client should read point-native breakdown field ${token}`,
      );
    }
    assert.ok(
      !bonusSource.includes('currency: res.currency || "USD"'),
      "bonus-client should not fall back to USD for wallet breakdowns",
    );
    assert.ok(
      !breakdownType.includes("currency: string") &&
        !breakdownState.includes("currency: string"),
      "WalletBreakdown should expose unit instead of currency",
    );
    assert.ok(
      !breakdownType.includes("realMoneyCents") &&
        !breakdownType.includes("bonusFundCents") &&
        !breakdownType.includes("totalCents"),
      "WalletBreakdown should not export retired breakdown aliases",
    );
    assert.ok(
      !breakdownState.includes("realMoneyCents") &&
        !breakdownState.includes("bonusFundCents") &&
        !breakdownState.includes("totalCents"),
      "bonus store breakdown state should not retain retired breakdown aliases",
    );
    assert.ok(
      bonusSource.includes("interface LegacyBreakdownResponse") &&
        breakdownNormalizer.includes("legacyRes.realMoneyCents") &&
        breakdownNormalizer.includes("legacyRes.bonusFundCents") &&
        breakdownNormalizer.includes("legacyRes.totalCents") &&
        !breakdownNormalizer.includes("realMoneyCents: basePointsCents") &&
        !breakdownNormalizer.includes("bonusFundCents: bonusPointsCents") &&
        !breakdownNormalizer.includes("totalCents: totalPointsCents"),
      "legacy breakdown fields should be read privately but not reattached",
    );
    for (const token of [
      't("basePoints", "Base Points")',
      't("bonusPoints", "Bonus Points")',
      "breakdown.basePointsCents",
      "breakdown.bonusPointsCents",
      "breakdown.totalPointsCents",
    ]) {
      assert.ok(
        walletBreakdownSource.includes(token),
        `WalletBreakdown should render point-native field ${token}`,
      );
    }
    assert.ok(
      !walletBreakdownSource.includes('t("realMoney")') &&
        !walletBreakdownSource.includes('t("bonusFunds")') &&
        !walletBreakdownSource.includes("breakdown.realMoneyCents") &&
        !walletBreakdownSource.includes("breakdown.bonusFundCents"),
      "WalletBreakdown should not render legacy real-money/bonus-fund fields",
    );
  });

  it("normalizes active bonus payloads from point-native aliases first", () => {
    const playerBonusType = sliceBetween(
      bonusSource,
      "export interface PlayerBonus {",
      "export interface WalletBreakdown",
    );
    const activeBonusState = sliceBetween(
      bonusSliceSource,
      "interface ActiveBonus {",
      "interface BonusState",
    );

    for (const token of [
      "normalizePlayerBonus",
      "grantedPointsCents",
      "remainingPointsCents",
      "playRequiredPointsCents",
      "playCompletedPointsCents",
      "playProgressPct",
      'raw.unit || "PTS"',
      "raw.bonusId ?? raw.bonus_id",
      "raw.campaignName ?? raw.campaign_name",
    ]) {
      assert.ok(
        bonusSource.includes(token),
        `bonus-client should normalize bonus payload token ${token}`,
      );
    }
    for (const retired of [
      "grantedAmountCents",
      "remainingAmountCents",
      "wageringRequiredCents",
      "wageringCompletedCents",
      "wageringProgressPct",
    ]) {
      assert.ok(
        !playerBonusType.includes(retired),
        `PlayerBonus should not export retired bonus field ${retired}`,
      );
      assert.ok(
        !activeBonusState.includes(retired),
        `ActiveBonus state should not retain retired bonus field ${retired}`,
      );
    }
  });

  it("normalizes bonus progress and visible progress copy as point play", () => {
    const playContributionType = sliceBetween(
      bonusSource,
      "export interface PlayContribution",
      "export interface BonusProgress",
    );
    const bonusProgressType = sliceBetween(
      bonusSource,
      "export interface BonusProgress {",
      "interface BonusListResponse",
    );

    for (const token of [
      "normalizeBonusProgress",
      "playRequiredPointsCents",
      "playCompletedPointsCents",
      "playProgressPct",
      'raw.unit || "PTS"',
      "playAmountPointsCents",
    ]) {
      assert.ok(
        bonusSource.includes(token),
        `bonus-client should normalize bonus progress token ${token}`,
      );
    }
    for (const retired of [
      "wageringRequiredCents",
      "wageringCompletedCents",
      "progressPct",
    ]) {
      assert.ok(
        !bonusProgressType.includes(retired),
        `BonusProgress should not export retired progress field ${retired}`,
      );
    }
    assert.ok(
      playContributionType.includes("playAmountPointsCents: number") &&
        playContributionType.includes("contributionPointsCents: number") &&
        !playContributionType.includes("stakePointsCents") &&
        bonusSource.includes(
          "playAmountPointsCents: raw.stakePointsCents ?? raw.stakeCents ?? 0",
        ),
      "PlayContribution should export point-play amount fields while keeping stake aliases private",
    );
    assert.ok(
      wageringProgressSource.includes('aria-label="Play progress"'),
      "progress component should use point-play assistive text",
    );
    assert.ok(
      wageringProgressSource.includes('t("playProgressRequired"'),
      "progress component should use point-play translation key",
    );
    assert.ok(
      !wageringProgressSource.includes('aria-label="Wagering progress"') &&
        !wageringProgressSource.includes('t("wageringRequired"'),
      "progress component should not render wagering copy",
    );
  });

  it("renders active bonus progress on the rewards page with point-play fields", () => {
    const activeBonusPanel = sliceBetween(
      activeBonusesControlSource,
      "function ActiveBonusesControl",
      "function formatPoints",
    );

    for (const token of [
      "getActiveBonuses",
      "const [activeBonuses, setActiveBonuses] = useState<PlayerBonus[]>([]);",
      "<ActiveBonusesControl bonuses={activeBonuses} />",
      "activeBonusesResult",
    ]) {
      assert.ok(
        rewardsPageSource.includes(token),
        `rewards page should include active bonus wiring token ${token}`,
      );
    }
    for (const token of [
      "WageringProgress",
      "requiredCents={bonus.playRequiredPointsCents}",
      "completedCents={bonus.playCompletedPointsCents}",
      "progressPct={bonus.playProgressPct}",
      "formatPoints(bonus.remainingPointsCents)",
      't("activeBonuses.title", "Active point-play bonuses")',
    ]) {
      assert.ok(
        activeBonusesControlSource.includes(token),
        `active bonus component should include active bonus UI token ${token}`,
      );
    }
    for (const retired of [
      "bonus.wageringRequiredCents",
      "bonus.wageringCompletedCents",
      "bonus.wageringProgressPct",
      "bonus.grantedAmountCents",
      "bonus.remainingAmountCents",
    ]) {
      assert.ok(
        !activeBonusPanel.includes(retired),
        `active bonus panel should not consume retired bonus field ${retired}`,
      );
    }
  });
});
