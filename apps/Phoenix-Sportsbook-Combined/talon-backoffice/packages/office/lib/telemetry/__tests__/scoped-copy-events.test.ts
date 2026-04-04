import {
  AUDIT_LOGS_SCOPED_COPY_EVENT,
  SCOPED_COPY_EVENT_DETAIL_KEYS,
  emitScopedCopyEvent,
} from "../scoped-copy-events";
import {
  createScopedCopyEventDetail,
  SCOPED_COPY_EVENT_DETAIL_FIXTURE_KEYS,
} from "../test-fixtures/scoped-copy-event-detail";

const expectScopedCopyDetailKeyParity = (
  detail: Record<string, unknown>,
): void => {
  expect([...SCOPED_COPY_EVENT_DETAIL_KEYS].sort()).toEqual(
    SCOPED_COPY_EVENT_DETAIL_FIXTURE_KEYS,
  );
  expect(Object.keys(detail).sort()).toEqual(
    SCOPED_COPY_EVENT_DETAIL_FIXTURE_KEYS,
  );
};

describe("emitScopedCopyEvent", () => {
  test("emits scoped-copy custom event when dispatch is available", () => {
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");

    const detail = createScopedCopyEventDetail();
    emitScopedCopyEvent(detail);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const emittedEvent = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(emittedEvent.type).toBe(AUDIT_LOGS_SCOPED_COPY_EVENT);
    expectScopedCopyDetailKeyParity(
      emittedEvent.detail as Record<string, unknown>,
    );
    expect(emittedEvent.detail).toEqual(detail);

    dispatchSpy.mockRestore();
  });

  test("is safe when dispatchEvent is unavailable", () => {
    const originalDispatch = window.dispatchEvent;

    try {
      Object.defineProperty(window, "dispatchEvent", {
        configurable: true,
        value: undefined,
      });

      expect(() =>
        emitScopedCopyEvent(
          createScopedCopyEventDetail({
          event: "fallback_unavailable",
          preset: "",
          copyMode: "manualFallback",
          isPresetActive: false,
          scopedUrlLengthBucket: "medium",
          scopedQueryKeyCount: 0,
          scopedQueryKeySignature: "none",
          explicitOverrideCount: 0,
          explicitOverrideKeySignature: "none",
          appliedFilterKeySignature: "none",
          hasTargetId: false,
          hasActionOverride: false,
          nonEmptyFilterCount: 0,
          }),
        ),
      ).not.toThrow();
    } finally {
      Object.defineProperty(window, "dispatchEvent", {
        configurable: true,
        value: originalDispatch,
      });
    }
  });

  test("is non-blocking when dispatchEvent throws", () => {
    const dispatchSpy = jest
      .spyOn(window, "dispatchEvent")
      .mockImplementation(() => {
        throw new Error("event target unavailable");
      });

    expect(() =>
      emitScopedCopyEvent(
        createScopedCopyEventDetail({
        event: "open_action",
        preset: "provider-reassigned",
        copyMode: "manualFallback",
        copyButtonLabel: "retry",
        scopedUrlLengthBucket: "long",
        scopedQueryKeyCount: 5,
        scopedQueryKeySignature: "action|limit|p|preset|targetId",
        explicitOverrideCount: 2,
        explicitOverrideKeySignature: "action|targetId",
        appliedFilterKeySignature: "action|targetId",
        hasActionOverride: true,
        nonEmptyFilterCount: 3,
        page: 2,
        pageSize: 50,
        }),
      ),
    ).not.toThrow();

    dispatchSpy.mockRestore();
  });
});
