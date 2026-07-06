export type ScopedCopyEventName =
  | "copy_success"
  | "fallback_unavailable"
  | "fallback_write_failed"
  | "retry_success"
  | "open_action";

export type ScopedUrlLengthBucket = "short" | "medium" | "long";

export type ScopedCopyEventDetail = {
  event: ScopedCopyEventName;
  pathname: string;
  preset: string;
  copyMode: "clipboard" | "manualFallback";
  isPresetActive: boolean;
  canOpenScopedUrl: boolean;
  copyButtonLabel: "copy" | "retry";
  scopedUrlLengthBucket: ScopedUrlLengthBucket;
  scopedQueryKeyCount: number;
  scopedQueryKeySignature: string;
  explicitOverrideCount: number;
  explicitOverrideKeySignature: string;
  appliedFilterKeySignature: string;
  hasTargetId: boolean;
  hasActionOverride: boolean;
  nonEmptyFilterCount: number;
  page: number;
  pageSize: number;
};

export const SCOPED_COPY_EVENT_DETAIL_KEYS = [
  "event",
  "pathname",
  "preset",
  "copyMode",
  "isPresetActive",
  "canOpenScopedUrl",
  "copyButtonLabel",
  "scopedUrlLengthBucket",
  "scopedQueryKeyCount",
  "scopedQueryKeySignature",
  "explicitOverrideCount",
  "explicitOverrideKeySignature",
  "appliedFilterKeySignature",
  "hasTargetId",
  "hasActionOverride",
  "nonEmptyFilterCount",
  "page",
  "pageSize",
] as const;

export const AUDIT_LOGS_SCOPED_COPY_EVENT =
  "phoenix.office.auditLogs.scopedCopy";

export const emitScopedCopyEvent = (detail: ScopedCopyEventDetail): void => {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }
  try {
    window.dispatchEvent(
      new CustomEvent(AUDIT_LOGS_SCOPED_COPY_EVENT, {
        detail,
      }),
    );
  } catch (_err) {
    // Non-blocking telemetry: UI workflow must continue even if event emission fails.
  }
};
