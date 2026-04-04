import {
  buildScopedCopyTelemetryContext,
  normalizeQueryKeyComponent,
  resolveFilterKeySignature,
  resolveScopedQueryKeyCount,
  resolveScopedQueryKeySignature,
  resolveScopedUrlLengthBucket,
} from "../scoped-copy-telemetry";

describe("scoped-copy telemetry utils", () => {
  test("normalizes query key components across decode, plus-space, and malformed fallback", () => {
    expect(normalizeQueryKeyComponent("%61ction")).toBe("action");
    expect(normalizeQueryKeyComponent("target+Id")).toBe("target Id");
    expect(normalizeQueryKeyComponent("target%2BId")).toBe("target+Id");
    expect(normalizeQueryKeyComponent("bad%ZZ")).toBe("bad%ZZ");
    expect(normalizeQueryKeyComponent("bad+%ZZ")).toBe("bad %ZZ");
  });

  test("resolves scoped URL length bucket boundaries", () => {
    expect(resolveScopedUrlLengthBucket("x".repeat(120))).toBe("short");
    expect(resolveScopedUrlLengthBucket("x".repeat(121))).toBe("medium");
    expect(resolveScopedUrlLengthBucket("x".repeat(240))).toBe("medium");
    expect(resolveScopedUrlLengthBucket("x".repeat(241))).toBe("long");
  });

  test("resolves scoped query key count", () => {
    expect(resolveScopedQueryKeyCount("/logs")).toBe(0);
    expect(resolveScopedQueryKeyCount("/logs?p=1&limit=20&preset=provider"))
      .toBe(3);
    expect(resolveScopedQueryKeyCount("/logs?p=1&&limit=20#frag")).toBe(2);
  });

  test("resolves scoped query key count for empty/fragment-only query shapes", () => {
    expect(resolveScopedQueryKeyCount("/logs?#fragment")).toBe(0);
    expect(resolveScopedQueryKeyCount("/logs?&&#fragment")).toBe(0);
    expect(resolveScopedQueryKeyCount("/logs?")).toBe(0);
  });

  test("resolves scoped query key count with empty-key and empty-value params", () => {
    expect(
      resolveScopedQueryKeyCount("/logs?=anon&action=bet.placed&novalue=&targetId"),
    ).toBe(4);
    expect(resolveScopedQueryKeyCount("/logs?=anon&&")).toBe(1);
  });

  test("resolves scoped query key signature with decode and dedupe", () => {
    expect(resolveScopedQueryKeySignature("/logs")).toBe("none");
    expect(
      resolveScopedQueryKeySignature(
        "/logs?targetId=odds%3A1&action=a&targetId=odds%3A1&p=1",
      ),
    ).toBe("action|p|targetId");
  });

  test("resolves scoped query key signature for empty/fragment-only query shapes", () => {
    expect(resolveScopedQueryKeySignature("/logs?#fragment")).toBe("none");
    expect(resolveScopedQueryKeySignature("/logs?&&#fragment")).toBe("none");
    expect(resolveScopedQueryKeySignature("/logs?")).toBe("none");
  });

  test("resolves scoped query key signature with empty-key and empty-value params", () => {
    expect(
      resolveScopedQueryKeySignature(
        "/logs?=anon&action=bet.placed&novalue=&targetId",
      ),
    ).toBe("action|novalue|targetId");
    expect(resolveScopedQueryKeySignature("/logs?=anon&&")).toBe("none");
  });

  test("resolves scoped query key decode normalization for percent-encoded key names", () => {
    expect(
      resolveScopedQueryKeyCount("/logs?target%49d=1&%61ction=2&target%49d=3"),
    ).toBe(3);
    expect(
      resolveScopedQueryKeySignature(
        "/logs?target%49d=1&%61ction=2&target%49d=3",
      ),
    ).toBe("action|targetId");
    expect(
      resolveScopedQueryKeySignature("/logs?%20=ignored&%61ction=2"),
    ).toBe("action");
  });

  test("resolves scoped query key signature safely for invalid percent-encoding", () => {
    expect(() =>
      resolveScopedQueryKeySignature("/logs?bad%ZZ=1&action=a"),
    ).not.toThrow();
    expect(() =>
      resolveScopedQueryKeySignature("/logs?bad%E0%A4%A=1&targetId=x"),
    ).not.toThrow();

    expect(resolveScopedQueryKeySignature("/logs?bad%ZZ=1&action=a")).toBe(
      "action|bad%ZZ",
    );
    expect(
      resolveScopedQueryKeySignature("/logs?bad%E0%A4%A=1&targetId=x"),
    ).toBe("bad%E0%A4%A|targetId");
  });

  test("resolves scoped query key signature normalization for plus-space and encoded plus", () => {
    expect(resolveScopedQueryKeyCount("/logs?target+Id=1&action=2")).toBe(2);
    expect(resolveScopedQueryKeySignature("/logs?target+Id=1&action=2")).toBe(
      "action|target Id",
    );
    expect(resolveScopedQueryKeySignature("/logs?target%2BId=1&action=2")).toBe(
      "action|target+Id",
    );
  });

  test("resolves scoped query key signature normalization matrix", () => {
    const cases: Array<{ url: string; expected: string }> = [
      { url: "/logs?action=a&targetId=t", expected: "action|targetId" },
      {
        url: "/logs?target%49d=1&%61ction=2&target%49d=3",
        expected: "action|targetId",
      },
      { url: "/logs?#fragment", expected: "none" },
      { url: "/logs?=anon&&", expected: "none" },
      { url: "/logs?bad%ZZ=1&action=a", expected: "action|bad%ZZ" },
      { url: "/logs?target+Id=1&action=2", expected: "action|target Id" },
      { url: "/logs?target%2BId=1&action=2", expected: "action|target+Id" },
    ];

    cases.forEach(({ url, expected }) => {
      expect(resolveScopedQueryKeySignature(url)).toBe(expected);
    });
  });

  test("resolves scoped query key count normalization matrix", () => {
    const cases: Array<{ url: string; expected: number }> = [
      { url: "/logs", expected: 0 },
      { url: "/logs?action=a&targetId=t", expected: 2 },
      { url: "/logs?target%49d=1&%61ction=2&target%49d=3", expected: 3 },
      { url: "/logs?#fragment", expected: 0 },
      { url: "/logs?=anon&&", expected: 1 },
      { url: "/logs?bad%ZZ=1&action=a", expected: 2 },
      { url: "/logs?target+Id=1&action=2", expected: 2 },
      { url: "/logs?target%2BId=1&action=2", expected: 2 },
    ];

    cases.forEach(({ url, expected }) => {
      expect(resolveScopedQueryKeyCount(url)).toBe(expected);
    });
  });

  test("resolves filter key signature", () => {
    expect(
      resolveFilterKeySignature({
        action: "",
        actorId: "",
        targetId: "",
        userId: "",
        freebetId: "",
        oddsBoostId: "",
      }),
    ).toBe("none");

    expect(
      resolveFilterKeySignature({
        action: "provider.stream.reassigned",
        actorId: "",
        targetId: "odds88:settlement",
        userId: "",
        freebetId: "",
        oddsBoostId: "",
      }),
    ).toBe("action|targetId");
  });

  test("resolves filter key signature normalization matrix", () => {
    const cases: Array<{
      filters: Parameters<typeof resolveFilterKeySignature>[0];
      expected: string;
    }> = [
      {
        filters: {
          action: "",
          actorId: "",
          targetId: "",
          userId: "",
          freebetId: "",
          oddsBoostId: "",
        },
        expected: "none",
      },
      {
        filters: {
          action: "provider.stream.reassigned",
          actorId: "",
          targetId: "",
          userId: "",
          freebetId: "",
          oddsBoostId: "",
        },
        expected: "action",
      },
      {
        filters: {
          action: "provider.stream.reassigned",
          actorId: "   ",
          targetId: "odds88:settlement",
          userId: "",
          freebetId: "",
          oddsBoostId: "",
        },
        expected: "action|targetId",
      },
      {
        filters: {
          action: "provider.stream.reassigned",
          actorId: "admin-1",
          targetId: "odds88:settlement",
          userId: "user-1",
          freebetId: "fb-1",
          oddsBoostId: "ob-1",
        },
        expected: "action|actorId|freebetId|oddsBoostId|targetId|userId",
      },
    ];

    cases.forEach(({ filters, expected }) => {
      expect(resolveFilterKeySignature(filters)).toBe(expected);
    });
  });

  test("builds scoped copy telemetry context", () => {
    const context = buildScopedCopyTelemetryContext({
      pathname: "/logs",
      preset: "provider-ack-sla-default",
      isPresetActive: true,
      canOpenScopedUrl: true,
      copyButtonLabel: "retry",
      scopedUrl:
        "http://localhost:3000/logs?p=1&limit=20&preset=provider-ack-sla-default&action=provider.stream.reassigned&targetId=odds88%3Asettlement",
      explicitFilters: {
        action: "provider.stream.reassigned",
        actorId: "",
        targetId: "odds88:settlement",
        userId: "",
        freebetId: "",
        oddsBoostId: "",
      },
      appliedFilters: {
        action: "provider.stream.reassigned",
        actorId: "",
        targetId: "odds88:settlement",
        userId: "",
        freebetId: "",
        oddsBoostId: "",
      },
      page: 1,
      pageSize: 20,
    });

    expect(context.pathname).toBe("/logs");
    expect(context.preset).toBe("provider-ack-sla-default");
    expect(context.isPresetActive).toBe(true);
    expect(context.copyButtonLabel).toBe("retry");
    expect(context.canOpenScopedUrl).toBe(true);
    expect(context.scopedQueryKeyCount).toBe(5);
    expect(context.scopedQueryKeySignature).toBe(
      "action|limit|p|preset|targetId",
    );
    expect(context.explicitOverrideCount).toBe(2);
    expect(context.explicitOverrideKeySignature).toBe("action|targetId");
    expect(context.appliedFilterKeySignature).toBe("action|targetId");
    expect(context.nonEmptyFilterCount).toBe(2);
    expect(context.hasTargetId).toBe(true);
    expect(context.hasActionOverride).toBe(true);
    expect(context.page).toBe(1);
    expect(context.pageSize).toBe(20);
  });

  test("builds scoped copy telemetry context matrix", () => {
    const emptyFilters = {
      action: "",
      actorId: "",
      targetId: "",
      userId: "",
      freebetId: "",
      oddsBoostId: "",
    };
    const withFilters = (
      overrides: Partial<typeof emptyFilters>,
    ): typeof emptyFilters => ({
      ...emptyFilters,
      ...overrides,
    });

    const cases: Array<{
      input: Parameters<typeof buildScopedCopyTelemetryContext>[0];
      expected: {
        explicitOverrideCount: number;
        explicitOverrideKeySignature: string;
        appliedFilterKeySignature: string;
        hasTargetId: boolean;
        hasActionOverride: boolean;
        nonEmptyFilterCount: number;
        copyButtonLabel: "copy" | "retry";
        canOpenScopedUrl: boolean;
        scopedQueryKeyCount: number;
        scopedQueryKeySignature: string;
        scopedUrlLengthBucket: "short" | "medium" | "long";
      };
    }> = [
      {
        input: {
          pathname: "/logs",
          preset: "provider-ack-sla-default",
          isPresetActive: true,
          canOpenScopedUrl: true,
          copyButtonLabel: "copy",
          scopedUrl:
            "http://localhost:3000/logs?p=1&limit=20&preset=provider-ack-sla-default",
          explicitFilters: withFilters({}),
          appliedFilters: withFilters({
            action: "provider.stream.sla.default.updated",
            targetId: "provider.stream.sla.default",
          }),
          page: 1,
          pageSize: 20,
        },
        expected: {
          explicitOverrideCount: 0,
          explicitOverrideKeySignature: "none",
          appliedFilterKeySignature: "action|targetId",
          hasTargetId: true,
          hasActionOverride: false,
          nonEmptyFilterCount: 2,
          copyButtonLabel: "copy",
          canOpenScopedUrl: true,
          scopedQueryKeyCount: 3,
          scopedQueryKeySignature: "limit|p|preset",
          scopedUrlLengthBucket: "short",
        },
      },
      {
        input: {
          pathname: "/logs",
          preset: "provider-ack-sla-default",
          isPresetActive: true,
          canOpenScopedUrl: true,
          copyButtonLabel: "copy",
          scopedUrl:
            "http://localhost:3000/logs?p=1&limit=20&preset=provider-ack-sla-default&action=provider.stream.reassigned&targetId=odds88%3Asettlement",
          explicitFilters: withFilters({
            action: "provider.stream.reassigned",
            targetId: "odds88:settlement",
          }),
          appliedFilters: withFilters({
            action: "provider.stream.reassigned",
            targetId: "odds88:settlement",
          }),
          page: 1,
          pageSize: 20,
        },
        expected: {
          explicitOverrideCount: 2,
          explicitOverrideKeySignature: "action|targetId",
          appliedFilterKeySignature: "action|targetId",
          hasTargetId: true,
          hasActionOverride: true,
          nonEmptyFilterCount: 2,
          copyButtonLabel: "copy",
          canOpenScopedUrl: true,
          scopedQueryKeyCount: 5,
          scopedQueryKeySignature: "action|limit|p|preset|targetId",
          scopedUrlLengthBucket: "medium",
        },
      },
      {
        input: {
          pathname: "/logs",
          preset: "provider-ack-sla-default",
          isPresetActive: true,
          canOpenScopedUrl: true,
          copyButtonLabel: "copy",
          scopedUrl:
            "http://localhost:3000/logs?p=1&limit=20&preset=provider-ack-sla-default&action=provider.stream.reassigned&targetId=odds88%3Asettlement&context=" +
            "x".repeat(180),
          explicitFilters: withFilters({
            action: "provider.stream.reassigned",
            targetId: "odds88:settlement",
          }),
          appliedFilters: withFilters({
            action: "provider.stream.reassigned",
            targetId: "odds88:settlement",
          }),
          page: 1,
          pageSize: 20,
        },
        expected: {
          explicitOverrideCount: 2,
          explicitOverrideKeySignature: "action|targetId",
          appliedFilterKeySignature: "action|targetId",
          hasTargetId: true,
          hasActionOverride: true,
          nonEmptyFilterCount: 2,
          copyButtonLabel: "copy",
          canOpenScopedUrl: true,
          scopedQueryKeyCount: 6,
          scopedQueryKeySignature: "action|context|limit|p|preset|targetId",
          scopedUrlLengthBucket: "long",
        },
      },
      {
        input: {
          pathname: "/logs",
          preset: "",
          isPresetActive: false,
          canOpenScopedUrl: false,
          copyButtonLabel: "copy",
          scopedUrl: "http://localhost:3000/logs?p=1&limit=20",
          explicitFilters: withFilters({}),
          appliedFilters: withFilters({}),
          page: 1,
          pageSize: 20,
        },
        expected: {
          explicitOverrideCount: 0,
          explicitOverrideKeySignature: "none",
          appliedFilterKeySignature: "none",
          hasTargetId: false,
          hasActionOverride: false,
          nonEmptyFilterCount: 0,
          copyButtonLabel: "copy",
          canOpenScopedUrl: false,
          scopedQueryKeyCount: 2,
          scopedQueryKeySignature: "limit|p",
          scopedUrlLengthBucket: "short",
        },
      },
      {
        input: {
          pathname: "/logs",
          preset: "provider-ack-sla-default",
          isPresetActive: true,
          canOpenScopedUrl: true,
          copyButtonLabel: "retry",
          scopedUrl:
            "http://localhost:3000/logs?p=1&limit=20&preset=provider-ack-sla-default",
          explicitFilters: withFilters({}),
          appliedFilters: withFilters({
            action: "provider.stream.sla.default.updated",
            targetId: "provider.stream.sla.default",
          }),
          page: 1,
          pageSize: 20,
        },
        expected: {
          explicitOverrideCount: 0,
          explicitOverrideKeySignature: "none",
          appliedFilterKeySignature: "action|targetId",
          hasTargetId: true,
          hasActionOverride: false,
          nonEmptyFilterCount: 2,
          copyButtonLabel: "retry",
          canOpenScopedUrl: true,
          scopedQueryKeyCount: 3,
          scopedQueryKeySignature: "limit|p|preset",
          scopedUrlLengthBucket: "short",
        },
      },
    ];

    cases.forEach(({ input, expected }) => {
      const context = buildScopedCopyTelemetryContext(input);
      expect(context.explicitOverrideCount).toBe(expected.explicitOverrideCount);
      expect(context.explicitOverrideKeySignature).toBe(
        expected.explicitOverrideKeySignature,
      );
      expect(context.appliedFilterKeySignature).toBe(
        expected.appliedFilterKeySignature,
      );
      expect(context.hasTargetId).toBe(expected.hasTargetId);
      expect(context.hasActionOverride).toBe(expected.hasActionOverride);
      expect(context.nonEmptyFilterCount).toBe(expected.nonEmptyFilterCount);
      expect(context.copyButtonLabel).toBe(expected.copyButtonLabel);
      expect(context.canOpenScopedUrl).toBe(expected.canOpenScopedUrl);
      expect(context.scopedQueryKeyCount).toBe(expected.scopedQueryKeyCount);
      expect(context.scopedQueryKeySignature).toBe(
        expected.scopedQueryKeySignature,
      );
      expect(context.pathname).toBe("/logs");
      expect(context.page).toBe(1);
      expect(context.pageSize).toBe(20);
      expect(context.scopedUrlLengthBucket).toBe(
        expected.scopedUrlLengthBucket,
      );
    });
  });
});
