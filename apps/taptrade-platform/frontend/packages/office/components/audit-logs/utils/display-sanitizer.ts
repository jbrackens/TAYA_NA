// Keys here are the RAW spellings as stored in historical audit rows —
// including the money-era "Cents" forms. They rename to point-native
// display names; stored data is never rewritten. (Points unit-model
// 2026-07-07: the sweep briefly renamed the raw keys themselves, which
// let legacy rows through unsanitized.)
const AUDIT_DETAIL_DISPLAY_KEY_ALIASES: Record<string, string> = {
  freebetId: "pointGrantId",
  oddsBoostId: "pointRuleId",
  freebetAppliedCents: "pointGrantAppliedPoints",
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
