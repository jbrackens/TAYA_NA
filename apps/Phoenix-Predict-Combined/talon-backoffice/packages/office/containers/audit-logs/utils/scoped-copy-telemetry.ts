export type ScopedAuditFilters = {
  action: string;
  actorId: string;
  targetId: string;
  userId: string;
  freebetId: string;
  oddsBoostId: string;
  product?: string;
};

export type ScopedCopyTelemetryContext = {
  pathname: string;
  preset: string;
  isPresetActive: boolean;
  canOpenScopedUrl: boolean;
  copyButtonLabel: "copy" | "retry";
  scopedUrlLengthBucket: "short" | "medium" | "long";
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

export type BuildScopedCopyTelemetryContextInput = {
  pathname: string;
  preset: string;
  isPresetActive: boolean;
  canOpenScopedUrl: boolean;
  copyButtonLabel: "copy" | "retry";
  scopedUrl: string;
  explicitFilters: ScopedAuditFilters;
  appliedFilters: ScopedAuditFilters;
  page: number;
  pageSize: number;
};

export const resolveScopedUrlLengthBucket = (
  url: string,
): "short" | "medium" | "long" => {
  const length = url.length;
  if (length <= 120) {
    return "short";
  }
  if (length <= 240) {
    return "medium";
  }
  return "long";
};

export const resolveScopedQueryKeyCount = (url: string): number => {
  const queryStart = url.indexOf("?");
  if (queryStart === -1) {
    return 0;
  }
  const fragmentStart = url.indexOf("#", queryStart);
  const queryString = url.slice(
    queryStart + 1,
    fragmentStart === -1 ? undefined : fragmentStart,
  );
  if (!queryString) {
    return 0;
  }
  return queryString
    .split("&")
    .map((segment) => segment.trim())
    .filter(Boolean).length;
};

export const resolveScopedQueryKeySignature = (url: string): string => {
  const queryStart = url.indexOf("?");
  if (queryStart === -1) {
    return "none";
  }
  const fragmentStart = url.indexOf("#", queryStart);
  const queryString = url.slice(
    queryStart + 1,
    fragmentStart === -1 ? undefined : fragmentStart,
  );
  if (!queryString) {
    return "none";
  }
  const keys = queryString
    .split("&")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) =>
      normalizeQueryKeyComponent(segment.split("=")[0] || "").trim(),
    )
    .filter(Boolean);
  if (!keys.length) {
    return "none";
  }
  return Array.from(new Set(keys)).sort().join("|");
};

export const normalizeQueryKeyComponent = (value: string): string => {
  const normalizedValue = value.replace(/\+/g, " ");
  try {
    return decodeURIComponent(normalizedValue);
  } catch (_err) {
    return normalizedValue;
  }
};

export const resolveFilterKeySignature = (
  filters: ScopedAuditFilters,
): string => {
  const keys = Object.entries(filters)
    .filter(([_key, value]) => Boolean(`${value || ""}`.trim()))
    .map(([key]) => key)
    .sort();
  if (!keys.length) {
    return "none";
  }
  return keys.join("|");
};

export const buildScopedCopyTelemetryContext = ({
  pathname,
  preset,
  isPresetActive,
  canOpenScopedUrl,
  copyButtonLabel,
  scopedUrl,
  explicitFilters,
  appliedFilters,
  page,
  pageSize,
}: BuildScopedCopyTelemetryContextInput): ScopedCopyTelemetryContext => {
  const nonEmptyFilterCount = Object.values(appliedFilters).filter((value) =>
    Boolean(`${value || ""}`.trim()),
  ).length;
  const explicitOverrideCount = Object.values(explicitFilters).filter((value) =>
    Boolean(`${value || ""}`.trim()),
  ).length;

  return {
    pathname,
    preset,
    isPresetActive,
    canOpenScopedUrl,
    copyButtonLabel,
    scopedUrlLengthBucket: resolveScopedUrlLengthBucket(scopedUrl),
    scopedQueryKeyCount: resolveScopedQueryKeyCount(scopedUrl),
    scopedQueryKeySignature: resolveScopedQueryKeySignature(scopedUrl),
    explicitOverrideCount,
    explicitOverrideKeySignature: resolveFilterKeySignature(explicitFilters),
    appliedFilterKeySignature: resolveFilterKeySignature(appliedFilters),
    hasTargetId: Boolean(appliedFilters.targetId),
    hasActionOverride: Boolean(explicitFilters.action),
    nonEmptyFilterCount,
    page,
    pageSize,
  };
};
