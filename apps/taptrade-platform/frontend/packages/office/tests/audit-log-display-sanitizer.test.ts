import { describe, expect, test } from "vitest";
import { sanitizeAuditDetailsForDisplay } from "../components/audit-logs/utils/display-sanitizer";

describe("audit log display sanitizer", () => {
  test("renames inherited promo keys before audit diff display", () => {
    const rawDetails = {
      freebetId: "fb-1",
      oddsBoostId: "ob-1",
      freebetAppliedCents: 250,
      nested: {
        freebetId: "fb-2",
      },
      rows: [
        {
          oddsBoostId: "ob-2",
          freebetAppliedCents: 500,
        },
      ],
    };

    const sanitized = sanitizeAuditDetailsForDisplay(rawDetails);

    expect(sanitized).toEqual({
      pointGrantId: "fb-1",
      pointRuleId: "ob-1",
      pointGrantAppliedPoints: 250,
      nested: {
        pointGrantId: "fb-2",
      },
      rows: [
        {
          pointRuleId: "ob-2",
          pointGrantAppliedPoints: 500,
        },
      ],
    });
    expect(JSON.stringify(sanitized)).not.toContain("freebet");
    expect(JSON.stringify(sanitized)).not.toContain("oddsBoost");
    expect(rawDetails).toHaveProperty("freebetId", "fb-1");
  });

  test("keeps existing point-native values when both compatibility and launch keys are present", () => {
    expect(
      sanitizeAuditDetailsForDisplay({
        pointGrantId: "point-grant-1",
        freebetId: "fb-legacy",
        pointRuleId: "point-rule-1",
        oddsBoostId: "ob-legacy",
      }),
    ).toEqual({
      pointGrantId: "point-grant-1",
      pointRuleId: "point-rule-1",
    });
  });
});
