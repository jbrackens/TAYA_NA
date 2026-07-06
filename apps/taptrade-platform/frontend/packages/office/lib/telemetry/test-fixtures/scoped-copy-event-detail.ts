import { ScopedCopyEventDetail } from "../scoped-copy-events";

const DEFAULT_SCOPED_COPY_EVENT_DETAIL: ScopedCopyEventDetail = {
  event: "copy_success",
  pathname: "/logs",
  preset: "provider-ack-sla-default",
  copyMode: "clipboard",
  isPresetActive: true,
  canOpenScopedUrl: true,
  copyButtonLabel: "copy",
  scopedUrlLengthBucket: "short",
  scopedQueryKeyCount: 3,
  scopedQueryKeySignature: "limit|p|preset",
  explicitOverrideCount: 0,
  explicitOverrideKeySignature: "none",
  appliedFilterKeySignature: "action|targetId",
  hasTargetId: true,
  hasActionOverride: false,
  nonEmptyFilterCount: 2,
  page: 1,
  pageSize: 20,
};

export const SCOPED_COPY_EVENT_DETAIL_FIXTURE_KEYS = Object.keys(
  DEFAULT_SCOPED_COPY_EVENT_DETAIL,
).sort();

export const createScopedCopyEventDetail = (
  overrides: Partial<ScopedCopyEventDetail> = {},
): ScopedCopyEventDetail => ({
  ...DEFAULT_SCOPED_COPY_EVENT_DETAIL,
  ...overrides,
});
