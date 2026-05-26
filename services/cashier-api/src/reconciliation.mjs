export function buildDailyReconciliationReport({
  businessDate,
  generatedAt,
  generatedBy,
  depositIntents = [],
  bridgeEvents = [],
}) {
  const bridgeEventsByDepositId = new Map();
  const bridgeEventsByProviderRequestId = new Map();
  for (const event of bridgeEvents) {
    if (event.depositIntentId) {
      bridgeEventsByDepositId.set(event.depositIntentId, event);
    }
    if (event.providerRequestId) {
      bridgeEventsByProviderRequestId.set(event.providerRequestId, event);
    }
  }

  const items = depositIntents.map((intent) => {
    const event =
      bridgeEventsByDepositId.get(intent.id) ??
      bridgeEventsByProviderRequestId.get(intent.providerRequestId);
    const expectedUnits = expectedDepositUnits(intent);
    const observedUnits = event?.amount?.units ?? event?.amountUnits ?? "0";
    const status = reconciliationStatus(intent, event, expectedUnits, observedUnits);

    return compact({
      id: `recon_item_${stableSuffix(`${businessDate}:${intent.id}`)}`,
      subjectType: "deposit",
      subjectId: intent.id,
      expectedUnits,
      observedUnits,
      asset: intent.settlementAsset ?? event?.amount?.asset ?? event?.asset ?? "hUSD",
      chain: intent.settlementChain ?? event?.destinationChain ?? "settlement",
      status,
      providerRequestId: intent.providerRequestId ?? event?.providerRequestId,
      sourceTxHash: intent.sourceTxHash ?? event?.sourceTxHash,
      destinationTxHash: intent.destinationTxHash ?? event?.destinationTxHash,
      notes: reconciliationNotes(intent, event, status),
    });
  });

  return {
    id: `recon_${businessDate.replaceAll("-", "_")}`,
    businessDate,
    generatedAt,
    generatedBy,
    items,
  };
}

function expectedDepositUnits(intent) {
  return (
    intent.settledAmount?.units ??
    intent.settledUnits ??
    intent.actualSourceAmount?.units ??
    intent.actualSourceUnits ??
    intent.expectedSourceAmount?.units ??
    intent.expectedSourceUnits ??
    "0"
  );
}

function reconciliationStatus(intent, event, expectedUnits, observedUnits) {
  if (intent.status === "recovery_required" || event?.status === "quarantined") {
    return "quarantined";
  }
  if (!event) {
    return "missing_provider";
  }
  if (expectedUnits !== observedUnits) {
    return "amount_mismatch";
  }
  return "matched";
}

function reconciliationNotes(intent, event, status) {
  if (status === "matched") {
    return undefined;
  }
  if (status === "missing_provider") {
    return `No bridge/provider event found for deposit intent ${intent.id}`;
  }
  if (status === "quarantined") {
    return intent.recoveryReason ?? event?.recoveryReason ?? "Recovery required";
  }
  return `Expected ${expectedDepositUnits(intent)} but observed ${
    event?.amount?.units ?? event?.amountUnits ?? "0"
  }`;
}

function compact(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null),
  );
}

function stableSuffix(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
