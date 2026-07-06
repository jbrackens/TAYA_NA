/**
 * Client-side idempotency key derivation for order placement.
 *
 * LC-38: the player app must send a STABLE idempotencyKey so that a manual
 * re-submit after a dropped network response is deduped by the gateway
 * (which short-circuits on a repeated key and dedupes the wallet debit on
 * the UNIQUE (kind,user,idempotency_key) constraint) instead of minting a
 * fresh `auto:...:UnixNano()` key per request and double-executing.
 *
 * Contract:
 *  - A retry of the SAME order (identical signature) while the previous
 *    attempt's outcome is still unconfirmed reuses the same key, so the
 *    gateway replays the original order rather than placing a second one.
 *  - A genuinely different order (any order-defining field changed) gets a
 *    fresh key — never a stale replay of the prior order under its key.
 *  - After a confirmed success the caller clears the pending state, so an
 *    intentional repeat of an identical order is a new order, not a replay.
 *
 * Pure and dependency-free so it can be unit-tested directly (no React).
 */

export interface OrderIdempotencySig {
  marketId: string;
  side: string;
  action: string;
  orderType: string;
  quantity: number;
  pricePointsCents?: number;
  timeInForce?: string;
  postOnly?: boolean;
  notionalCapPointsCents?: number;
}

export interface PendingIdempotency {
  key: string;
  sig: string;
}

/**
 * Stable signature of the order-defining fields. Two requests that would
 * place the same order produce the same signature; any change a user could
 * make in the ticket (size, price, side, TIF, cap) produces a different one.
 */
export function orderSignature(req: OrderIdempotencySig): string {
  return JSON.stringify([
    req.marketId,
    req.side,
    req.action,
    req.orderType,
    req.quantity,
    req.pricePointsCents ?? null,
    req.timeInForce ?? null,
    req.postOnly ?? null,
    req.notionalCapPointsCents ?? null,
  ]);
}

/**
 * Resolve the idempotency key to send. If there is a still-pending
 * (unconfirmed) attempt for an identical signature, reuse its key so the
 * gateway dedupes the retry; otherwise mint a fresh key.
 */
export function resolveIdempotencyKey(
  pending: PendingIdempotency | null,
  sig: string,
  mint: () => string,
): { key: string; pending: PendingIdempotency } {
  if (pending && pending.sig === sig) {
    return { key: pending.key, pending };
  }
  const key = mint();
  return { key, pending: { key, sig } };
}
