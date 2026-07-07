const AUDIT_DETAIL_DISPLAY_KEY_ALIASES: Record<string, string> = {
  freebetId: "pointGrantId",
  oddsBoostId: "pointRuleId",
  freebetAppliedPoints: "pointGrantAppliedPoints",
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === "[object Object]";

export const sanitizeAuditDetailsForDisplay = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitizeAuditDetailsForDisplay);
  }

  if (!isPlainRecord(value)) {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>(
    (result, [key, entryValue]) => {
      const displayKey = AUDIT_DETAIL_DISPLAY_KEY_ALIASES[key] || key;
      if (
        displayKey !== key &&
        Object.prototype.hasOwnProperty.call(result, displayKey)
      ) {
        return result;
      }
      result[displayKey] = sanitizeAuditDetailsForDisplay(entryValue);
      return result;
    },
    {},
  );
};
