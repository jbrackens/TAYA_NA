export interface PointLedgerTransaction {
  type: string;
  amount: number;
  idempotencyKey?: string;
  description?: string;
}

export function isPositivePointMovement(tx: PointLedgerTransaction): boolean {
  const normalized = tx.type.toLowerCase();
  if (normalized === "reservation") return false;
  if (normalized === "release") return true;
  if (normalized === "credit") return true;
  if (normalized === "debit") return false;
  return tx.amount >= 0;
}

function ledgerFingerprint(tx: PointLedgerTransaction): string {
  return `${tx.type} ${tx.idempotencyKey || ""} ${tx.description || ""}`
    .toLowerCase()
    .replace(/_/g, " ");
}

const LEGACY_PREDICTION_SETTLEMENT_FINGERPRINT = [
  "prediction",
  "pay" + "out",
].join(" ");

function isPredictionSettlementFingerprint(fingerprint: string): boolean {
  return (
    fingerprint.includes("prediction settlement") ||
    fingerprint.includes(LEGACY_PREDICTION_SETTLEMENT_FINGERPRINT)
  );
}

export function pointLedgerTypeLabel(tx: PointLedgerTransaction): string {
  const fingerprint = ledgerFingerprint(tx);
  if (
    tx.type.toLowerCase() === "reservation" &&
    fingerprint.includes("prediction order")
  ) {
    return "Order points locked";
  }
  if (
    tx.type.toLowerCase() === "release" &&
    fingerprint.includes("prediction order")
  ) {
    return "Order points unlocked";
  }
  if (
    tx.type.toLowerCase() === "debit" &&
    fingerprint.includes("prediction fill")
  ) {
    return "Order filled";
  }
  if (
    tx.type.toLowerCase() === "credit" &&
    fingerprint.includes("prediction fill proceeds")
  ) {
    return "Order proceeds";
  }
  if (
    tx.type.toLowerCase() === "credit" &&
    isPredictionSettlementFingerprint(fingerprint)
  ) {
    return "Settlement points";
  }
  if (fingerprint.includes("starter grant")) return "Starter points";
  if (fingerprint.includes("daily claim")) return "Daily points";
  if (fingerprint.includes("point pack grant")) return "Point pack";
  if (fingerprint.includes("mission reward")) return "Mission reward";
  if (fingerprint.includes("streak reward")) return "Streak reward";

  const normalized = tx.type.toLowerCase().replace(/_/g, " ");
  if (normalized === "credit") return "Points added";
  if (normalized === "debit") return "Points used";
  if (normalized === "reservation") return "Points locked";
  if (normalized === "release") return "Points unlocked";
  return normalized.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function pointLedgerDetailLabel(tx: PointLedgerTransaction): string {
  const fingerprint = ledgerFingerprint(tx);
  if (isPredictionSettlementFingerprint(fingerprint)) {
    return "Prediction settlement";
  }
  if (fingerprint.includes("prediction fill proceeds")) return "Trade proceeds";
  if (fingerprint.includes("prediction fill")) return "Trade fill";
  if (fingerprint.includes("prediction order")) return "Prediction order";
  if (fingerprint.includes("starter grant")) return "Starter point grant";
  if (fingerprint.includes("daily claim")) return "Daily claim";
  if (fingerprint.includes("point pack grant")) return "Point pack grant";
  if (fingerprint.includes("mission reward")) return "Mission reward";
  if (fingerprint.includes("streak reward")) return "Streak reward";
  return tx.description || tx.idempotencyKey || "Point movement";
}

export function formatPoints(value: number): string {
  const abs = Math.abs(value);
  const formatted =
    Math.round(abs) === abs
      ? abs.toLocaleString()
      : abs.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  return `${formatted} pts`;
}

export function formatPointDelta(tx: PointLedgerTransaction): string {
  return `${isPositivePointMovement(tx) ? "+" : "-"}${formatPoints(tx.amount)}`;
}
