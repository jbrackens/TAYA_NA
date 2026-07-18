/**
 * store-client.ts — Point Store API client (STORE_AND_PAYMENTS.md §7).
 *
 * All routes live under /api/v1/store/* and are session-authenticated; the
 * gateway registers them only when STORE_ENABLED=true. The client sends only
 * pack ids + an idempotency key — price and point amounts are resolved
 * server-side from the catalogue snapshot (§11 trust boundary), so nothing
 * here ever posts an amount.
 *
 * Point fields are whole Points on the wire (unit "PTS"); purchase prices are
 * integer USD cents (priceUsdCents) and are formatted client-side via
 * lib/usd — never stored in locale bundles.
 */

import { apiClient } from "./client";
import { toWholePoints } from "../points";

export type StorePurchaseStatus =
  | "pending_payment"
  | "completed"
  | "failed"
  | "canceled";

export type StoreDemoOutcome = "success" | "failure" | "cancel" | "delayed";

export interface StorePack {
  id: string;
  name: string;
  priceUsdCents: number;
  basePoints: number;
  bonusPoints: number;
  /** Computed base + bonus; the wire also carries it — trust but re-derive. */
  totalPoints: number;
  displayOrder: number;
  badge?: string;
  introOnly: boolean;
  promoStartsAt?: string;
  promoEndsAt?: string;
  unit: string;
}

export interface StoreCatalogue {
  packs: StorePack[];
  /** True until the caller completes their first point pack purchase. */
  firstPurchase: boolean;
}

export interface StorePurchase {
  id: string;
  userId: string;
  packId: string;
  status: StorePurchaseStatus;
  priceUsdCents: number;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  provider: string;
  providerSessionId?: string;
  failureReason?: string;
  createdAt: string;
  completedAt?: string;
  unit: string;
}

export interface StoreCheckoutSession {
  providerSessionId: string;
  checkoutToken: string;
}

export interface StoreCheckoutResult {
  purchase: StorePurchase;
  checkout?: StoreCheckoutSession;
}

export interface StoreConfirmResult {
  purchase: StorePurchase;
  /** True when the purchase was already completed — no points moved again. */
  alreadyFulfilled: boolean;
}

export interface StorePurchaseList {
  items: StorePurchase[];
  total: number;
}

// --- raw wire shapes (fields may be absent on older payloads) ---

interface RawStorePack extends Partial<Omit<StorePack, "id" | "name">> {
  id: string;
  name: string;
}

interface RawCatalogue {
  packs?: RawStorePack[];
  firstPurchase?: boolean;
  unit?: string;
}

interface RawStorePurchase extends Partial<
  Omit<StorePurchase, "id" | "status">
> {
  id: string;
  status: StorePurchaseStatus;
}

interface RawCheckoutResult {
  purchase: RawStorePurchase;
  checkout?: { providerSessionId?: string; checkoutToken?: string };
}

interface RawConfirmResult {
  purchase: RawStorePurchase;
  alreadyFulfilled?: boolean;
}

interface RawPurchaseStatus {
  purchase: RawStorePurchase;
}

interface RawPurchaseList {
  items?: RawStorePurchase[];
  total?: number;
}

const POINT_UNIT = "PTS";

function normalizePack(raw: RawStorePack): StorePack {
  const basePoints = toWholePoints(raw.basePoints);
  const bonusPoints = toWholePoints(raw.bonusPoints);
  return {
    id: raw.id,
    name: raw.name,
    priceUsdCents: toWholePoints(raw.priceUsdCents),
    basePoints,
    bonusPoints,
    // totalPoints is computed, never stored (§2). Re-derive so the pack math
    // invariant holds even if a legacy payload omits the computed field.
    totalPoints: basePoints + bonusPoints,
    displayOrder: raw.displayOrder ?? 0,
    badge: raw.badge,
    introOnly: raw.introOnly ?? false,
    promoStartsAt: raw.promoStartsAt,
    promoEndsAt: raw.promoEndsAt,
    unit: raw.unit || POINT_UNIT,
  };
}

function normalizePurchase(raw: RawStorePurchase): StorePurchase {
  const basePoints = toWholePoints(raw.basePoints);
  const bonusPoints = toWholePoints(raw.bonusPoints);
  return {
    id: raw.id,
    userId: raw.userId || "",
    packId: raw.packId || "",
    status: raw.status,
    priceUsdCents: toWholePoints(raw.priceUsdCents),
    basePoints,
    bonusPoints,
    totalPoints: basePoints + bonusPoints,
    provider: raw.provider || "demo",
    providerSessionId: raw.providerSessionId,
    failureReason: raw.failureReason,
    createdAt: raw.createdAt || "",
    completedAt: raw.completedAt,
    unit: raw.unit || POINT_UNIT,
  };
}

/** Active catalogue + the caller's first-purchase eligibility. */
export async function getPacks(): Promise<StoreCatalogue> {
  const raw = await apiClient.get<RawCatalogue>("/api/v1/store/packs");
  const packs = (raw.packs ?? [])
    .map(normalizePack)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  return { packs, firstPurchase: raw.firstPurchase ?? false };
}

/**
 * Creates a checkout attempt. The server resolves price/points from the pack
 * row and dedupes on UNIQUE(user, idempotencyKey) — a double-submitted POST
 * returns the same purchase (201 first time, 200 on replay).
 */
export async function createCheckout(
  packId: string,
  idempotencyKey: string,
): Promise<StoreCheckoutResult> {
  const raw = await apiClient.post<RawCheckoutResult>(
    "/api/v1/store/checkout",
    {
      packId,
      idempotencyKey,
    },
  );
  return {
    purchase: normalizePurchase(raw.purchase),
    checkout: raw.checkout?.providerSessionId
      ? {
          providerSessionId: raw.checkout.providerSessionId,
          checkoutToken: raw.checkout.checkoutToken || "",
        }
      : undefined,
  };
}

/**
 * Owner status read. A pending purchase re-checks the provider server-side,
 * so a delayed demo checkout flips to completed here (credited exactly once,
 * inside the gateway's one-tx fulfillment).
 */
export async function getPurchase(id: string): Promise<StorePurchase> {
  const raw = await apiClient.get<RawPurchaseStatus>(
    `/api/v1/store/purchases/${encodeURIComponent(id)}`,
  );
  return normalizePurchase(raw.purchase);
}

/** Session user's purchase history (newest first). */
export async function listPurchases(limit = 50): Promise<StorePurchaseList> {
  const raw = await apiClient.get<RawPurchaseList>("/api/v1/store/purchases", {
    limit: String(limit),
  });
  return {
    items: (raw.items ?? []).map(normalizePurchase),
    total: raw.total ?? raw.items?.length ?? 0,
  };
}

/**
 * Demo-provider-only simulated outcome. Duplicate success confirmations are
 * idempotent no-ops (alreadyFulfilled: true, no extra credit). Terminal
 * purchases reject with 409 — a failed checkout is retried by creating a NEW
 * checkout, never by re-confirming the old purchase.
 */
export async function confirmPurchase(
  id: string,
  outcome: StoreDemoOutcome,
): Promise<StoreConfirmResult> {
  const raw = await apiClient.post<RawConfirmResult>(
    `/api/v1/store/purchases/${encodeURIComponent(id)}/confirm`,
    { outcome },
  );
  return {
    purchase: normalizePurchase(raw.purchase),
    alreadyFulfilled: raw.alreadyFulfilled ?? false,
  };
}

// --- checkout idempotency (LC-38 pattern, see app/lib/orderIdempotency.ts) ---

export interface PendingCheckoutKey {
  packId: string;
  key: string;
}

/**
 * Resolve the idempotency key for a checkout attempt. While a checkout POST
 * for a given pack is unconfirmed (network drop, retry), the SAME key is
 * reused so the gateway returns the original purchase instead of minting a
 * second one. A different pack — or a cleared pending state after the
 * purchase is created — gets a fresh key.
 */
export function resolveCheckoutIdempotency(
  pending: PendingCheckoutKey | null,
  packId: string,
  mint: () => string = () => crypto.randomUUID(),
): { key: string; pending: PendingCheckoutKey } {
  if (pending && pending.packId === packId) {
    return { key: pending.key, pending };
  }
  const key = mint();
  return { key, pending: { packId, key } };
}
