import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Input, Row, Space, Typography } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "i18n";
import AuditLogsList from "../../components/audit-logs";
import {
  getList,
  getListSucceeded,
  selectData,
  selectTableMeta,
} from "../../lib/slices/logsSlice";
import { emitScopedCopyEvent } from "../../lib/telemetry/scoped-copy-events";
import { useApi } from "../../services/api/api-service";
import { Method } from "@phoenix-ui/utils";
import { useRouter } from "next/router";
import { buildScopedCopyTelemetryContext } from "./utils/scoped-copy-telemetry";

const resolveQueryValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
};

const resolveQueryPositiveInt = (
  value: string | string[] | undefined,
  fallback: number,
): number => {
  const parsed = Number.parseInt(resolveQueryValue(value), 10);
  if (!Number.isNaN(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

type AuditLogFilters = {
  action: string;
  actorId: string;
  targetId: string;
  userId: string;
  freebetId: string;
  oddsBoostId: string;
  product: string;
};

type AuditLogPreset = {
  key: string;
  labelKey: string;
  filters: Partial<AuditLogFilters>;
};

const buildFilterQuery = (
  filters: AuditLogFilters,
): Record<string, string | number> => ({
  ...(filters.action ? { action: filters.action } : {}),
  ...(filters.actorId ? { actorId: filters.actorId } : {}),
  ...(filters.targetId ? { targetId: filters.targetId } : {}),
  ...(filters.userId ? { userId: filters.userId } : {}),
  ...(filters.freebetId ? { freebetId: filters.freebetId } : {}),
  ...(filters.oddsBoostId ? { oddsBoostId: filters.oddsBoostId } : {}),
  ...(filters.product ? { product: filters.product } : {}),
});

const buildApiFilterQuery = (
  filters: AuditLogFilters,
): Record<string, string | number> => ({
  ...(filters.action ? { action: filters.action } : {}),
  ...(filters.actorId ? { actor_id: filters.actorId } : {}),
  ...(filters.targetId ? { target_id: filters.targetId } : {}),
  ...(filters.product ? { product: filters.product } : {}),
});

const providerOpsAuditPresets: AuditLogPreset[] = [
  {
    key: "provider-ack-sla-default",
    labelKey: "FILTER_PRESET_PROVIDER_ACK_SLA_DEFAULT",
    filters: {
      action: "provider.stream.sla.default.updated",
      targetId: "provider.stream.sla.default",
    },
  },
  {
    key: "provider-ack-sla-adapter",
    labelKey: "FILTER_PRESET_PROVIDER_ACK_SLA_ADAPTER",
    filters: {
      action: "provider.stream.sla.adapter.updated",
    },
  },
  {
    key: "provider-acknowledged",
    labelKey: "FILTER_PRESET_PROVIDER_ACKNOWLEDGED",
    filters: {
      action: "provider.stream.acknowledged",
    },
  },
  {
    key: "provider-reassigned",
    labelKey: "FILTER_PRESET_PROVIDER_REASSIGNED",
    filters: {
      action: "provider.stream.reassigned",
    },
  },
  {
    key: "provider-resolved",
    labelKey: "FILTER_PRESET_PROVIDER_RESOLVED",
    filters: {
      action: "provider.stream.resolved",
    },
  },
  {
    key: "provider-reopened",
    labelKey: "FILTER_PRESET_PROVIDER_REOPENED",
    filters: {
      action: "provider.stream.reopened",
    },
  },
];

const resolvePresetByKey = (
  key: string,
): AuditLogPreset | undefined =>
  providerOpsAuditPresets.find((preset) => preset.key === key);

const buildScopedAuditUrl = (
  query: Record<string, string | string[] | undefined>,
  pathname: string,
): string => {
  const queryParams = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    const normalizedValue = resolveQueryValue(value).trim();
    if (normalizedValue) {
      queryParams.set(key, normalizedValue);
    }
  });
  const queryString = queryParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
};

const AuditLogsContainer = () => {
  const { t } = useTranslation("page-audit-logs");
  const dispatch = useDispatch();
  const records = useSelector(selectData);
  const { paginationResponse } = useSelector(selectTableMeta);
  const [triggerAuditLogsListApi, isLoading] = useApi(
    "admin/audit-logs",
    Method.GET,
    getListSucceeded,
  );

  const router = useRouter();

  const { p, limit, preset, action, actorId, targetId, userId, freebetId, oddsBoostId, product } =
    router.query as {
    p?: string | string[];
    limit?: string | string[];
    preset?: string | string[];
    action?: string | string[];
    actorId?: string | string[];
    targetId?: string | string[];
    userId?: string | string[];
    freebetId?: string | string[];
    oddsBoostId?: string | string[];
    product?: string | string[];
  };
  const currentPage = resolveQueryPositiveInt(p, 1);
  const pageSize = resolveQueryPositiveInt(limit, 20);
  const presetKey = resolveQueryValue(preset).trim();
  const activePreset = useMemo(
    () => resolvePresetByKey(presetKey),
    [presetKey],
  );
  const presetFilters = useMemo(
    () => activePreset?.filters || {},
    [activePreset],
  );
  const explicitFilters = useMemo(
    (): AuditLogFilters => ({
      action: resolveQueryValue(action).trim(),
      actorId: resolveQueryValue(actorId).trim(),
      targetId: resolveQueryValue(targetId).trim(),
      userId: resolveQueryValue(userId).trim(),
      freebetId: resolveQueryValue(freebetId).trim(),
      oddsBoostId: resolveQueryValue(oddsBoostId).trim(),
      product: resolveQueryValue(product).trim(),
    }),
    [action, actorId, targetId, userId, freebetId, oddsBoostId, product],
  );
  const appliedFilters = useMemo(
    () => ({
      action: explicitFilters.action || presetFilters.action || "",
      actorId: explicitFilters.actorId || presetFilters.actorId || "",
      targetId: explicitFilters.targetId || presetFilters.targetId || "",
      userId: explicitFilters.userId || presetFilters.userId || "",
      freebetId: explicitFilters.freebetId || presetFilters.freebetId || "",
      oddsBoostId: explicitFilters.oddsBoostId || presetFilters.oddsBoostId || "",
      product: explicitFilters.product || presetFilters.product || "",
    }),
    [explicitFilters, presetFilters],
  );
  const [draftFilters, setDraftFilters] = useState<AuditLogFilters>(
    appliedFilters,
  );
  const [copiedScopedUrl, setCopiedScopedUrl] = useState(false);
  const [copyFallbackUrl, setCopyFallbackUrl] = useState("");

  useEffect(() => {
    setCopiedScopedUrl(false);
    setCopyFallbackUrl("");
  }, [
    presetKey,
    appliedFilters.action,
    appliedFilters.actorId,
    appliedFilters.targetId,
    appliedFilters.userId,
    appliedFilters.freebetId,
    appliedFilters.oddsBoostId,
    appliedFilters.product,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    if (!copyFallbackUrl || typeof document === "undefined") {
      return;
    }
    const fallbackInput = document.querySelector<HTMLInputElement>(
      "[data-testid='audit-scoped-url-fallback']",
    );
    if (!fallbackInput) {
      return;
    }
    fallbackInput.focus();
    fallbackInput.select();
  }, [copyFallbackUrl]);

  const handleTableChange = (pagination: any, _filters: any, _sorting: any) => {
    router.push(
      {
        query: {
          ...(presetKey ? { preset: presetKey } : {}),
          ...buildFilterQuery(appliedFilters),
          ...(pagination.current && { p: pagination.current }),
          ...(pagination.pageSize && { limit: pagination.pageSize }),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  useEffect((): any => {
    const fetchAuditLogs = async () => {
      try {
        dispatch(getList());
        await triggerAuditLogsListApi(undefined, {
          query: {
            ...buildApiFilterQuery(appliedFilters),
            page: currentPage,
            limit: pageSize,
            sort_by: "created_at",
            sort_dir: "desc",
          },
        });
      } catch (err) {
        console.error({ err });
      }
    };
    fetchAuditLogs();
  }, [
    appliedFilters,
    currentPage,
    dispatch,
    pageSize,
    triggerAuditLogsListApi,
  ]);

  const applyFilters = () => {
    const filters = {
      action: draftFilters.action.trim(),
      actorId: draftFilters.actorId.trim(),
      targetId: draftFilters.targetId.trim(),
      userId: draftFilters.userId.trim(),
      freebetId: draftFilters.freebetId.trim(),
      oddsBoostId: draftFilters.oddsBoostId.trim(),
      product: draftFilters.product.trim(),
    };

    router.push(
      {
        query: {
          ...(presetKey ? { preset: presetKey } : {}),
          ...buildFilterQuery(filters),
          p: 1,
          limit: pageSize,
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const applyPreset = (presetSelection: AuditLogPreset) => {
    const selectedFilters = presetSelection.filters;
    const preset: AuditLogFilters = {
      action: selectedFilters.action || "",
      actorId: selectedFilters.actorId || "",
      targetId: selectedFilters.targetId || "",
      userId: selectedFilters.userId || "",
      freebetId: selectedFilters.freebetId || "",
      oddsBoostId: selectedFilters.oddsBoostId || "",
      product: selectedFilters.product || "",
    };
    setDraftFilters(preset);
    router.push(
      {
        query: {
          preset: presetSelection.key,
          ...buildFilterQuery(preset),
          p: 1,
          limit: pageSize,
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const clearPreset = () => {
    setDraftFilters(explicitFilters);
    router.push(
      {
        query: {
          ...buildFilterQuery(explicitFilters),
          p: 1,
          limit: pageSize,
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const copyScopedUrl = async () => {
    const pathname = router.pathname || "/logs";
    const relativeUrl = buildScopedAuditUrl(router.query || {}, pathname);
    const absoluteUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${relativeUrl}`
        : relativeUrl;
    const wasInFallbackMode = Boolean(copyFallbackUrl);
    const canOpenScopedUrl =
      typeof window !== "undefined" && typeof window.open === "function";
    const copyButtonLabel: "copy" | "retry" = wasInFallbackMode
      ? "retry"
      : "copy";
    const telemetryContext = buildScopedCopyTelemetryContext({
      pathname,
      preset: presetKey,
      isPresetActive: Boolean(activePreset),
      canOpenScopedUrl,
      copyButtonLabel,
      scopedUrl: absoluteUrl,
      explicitFilters,
      appliedFilters,
      page: currentPage,
      pageSize,
    });
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setCopiedScopedUrl(false);
      setCopyFallbackUrl(absoluteUrl);
      emitScopedCopyEvent({
        event: "fallback_unavailable",
        copyMode: "manualFallback",
        ...telemetryContext,
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopyFallbackUrl("");
      setCopiedScopedUrl(true);
      emitScopedCopyEvent({
        event: wasInFallbackMode ? "retry_success" : "copy_success",
        copyMode: "clipboard",
        ...telemetryContext,
      });
      setTimeout(() => setCopiedScopedUrl(false), 1200);
    } catch (err) {
      console.error({ err });
      setCopiedScopedUrl(false);
      setCopyFallbackUrl(absoluteUrl);
      emitScopedCopyEvent({
        event: "fallback_write_failed",
        copyMode: "manualFallback",
        ...telemetryContext,
      });
    }
  };

  const openScopedUrl = (url: string) => {
    if (!url || typeof window === "undefined" || typeof window.open !== "function") {
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    emitScopedCopyEvent({
      event: "open_action",
      copyMode: "manualFallback",
      ...buildScopedCopyTelemetryContext({
        pathname: router.pathname || "/logs",
        preset: presetKey,
        isPresetActive: Boolean(activePreset),
        canOpenScopedUrl: true,
        copyButtonLabel: "retry",
        scopedUrl: url,
        explicitFilters,
        appliedFilters,
        page: currentPage,
        pageSize,
      }),
    });
  };

  const resetFilters = () => {
    const cleared: AuditLogFilters = {
      action: "",
      actorId: "",
      targetId: "",
      userId: "",
      freebetId: "",
      oddsBoostId: "",
      product: "",
    };
    setDraftFilters(cleared);
    router.push(
      {
        query: {
          p: 1,
          limit: pageSize,
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const columns = [
    {
      index: 1,
      value: {
        title: t("HEADER_TARGET"),
        dataIndex: "targetId",
      },
    },
    {
      index: 2,
      value: {
        title: t("HEADER_USER"),
        dataIndex: "userId",
      },
    },
    {
      index: 3,
      value: {
        title: t("HEADER_FREEBET"),
        dataIndex: "freebetId",
      },
    },
    {
      index: 4,
      value: {
        title: t("HEADER_ODDS_BOOST"),
        dataIndex: "oddsBoostId",
      },
    },
  ];

  return (
    <>
      <Card title={t("FILTER_TITLE")} style={{ marginBottom: 16 }}>
        {activePreset ? (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={`${t("FILTER_PRESET_ACTIVE_LABEL")} ${t(activePreset.labelKey)}`}
              action={
                <Space>
                  <Button size="small" onClick={copyScopedUrl}>
                    {copiedScopedUrl
                      ? t("FILTER_PRESET_COPY_URL_COPIED")
                      : copyFallbackUrl
                        ? t("FILTER_PRESET_COPY_URL_RETRY")
                        : t("FILTER_PRESET_COPY_URL")}
                  </Button>
                  <Button size="small" onClick={clearPreset}>
                    {t("FILTER_PRESET_CLEAR")}
                  </Button>
                </Space>
              }
            />
            {copyFallbackUrl ? (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message={t("FILTER_PRESET_COPY_URL_FALLBACK_MESSAGE")}
                description={
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Input
                      data-testid="audit-scoped-url-fallback"
                      readOnly
                      value={copyFallbackUrl}
                      onFocus={(event) => event.target.select()}
                    />
                    <Button size="small" onClick={() => openScopedUrl(copyFallbackUrl)}>
                      {t("FILTER_PRESET_COPY_URL_OPEN")}
                    </Button>
                  </Space>
                }
              />
            ) : null}
          </>
        ) : null}
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12} lg={8}>
            <Input
              value={draftFilters.action}
              onChange={(event) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  action: event.target.value,
                }))
              }
              placeholder={t("FILTER_ACTION_PLACEHOLDER")}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Input
              value={draftFilters.actorId}
              onChange={(event) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  actorId: event.target.value,
                }))
              }
              placeholder={t("FILTER_ACTOR_PLACEHOLDER")}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Input
              value={draftFilters.targetId}
              onChange={(event) => {
                const value = event.target.value;
                setDraftFilters((previous) => ({
                  ...previous,
                  targetId: value,
                }));
              }}
              placeholder={t("FILTER_TARGET_PLACEHOLDER")}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Input
              value={draftFilters.userId}
              onChange={(event) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  userId: event.target.value,
                }))
              }
              placeholder={t("FILTER_USER_PLACEHOLDER")}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Input
              value={draftFilters.freebetId}
              onChange={(event) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  freebetId: event.target.value,
                }))
              }
              placeholder={t("FILTER_FREEBET_PLACEHOLDER")}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Input
              value={draftFilters.oddsBoostId}
              onChange={(event) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  oddsBoostId: event.target.value,
                }))
              }
              placeholder={t("FILTER_ODDS_BOOST_PLACEHOLDER")}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Input
              value={draftFilters.product}
              onChange={(event) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  product: event.target.value,
                }))
              }
              placeholder={t("FILTER_PRODUCT_PLACEHOLDER")}
            />
          </Col>
          <Col span={24}>
            <Button type="primary" onClick={applyFilters} style={{ marginRight: 8 }}>
              {t("FILTER_APPLY")}
            </Button>
            <Button onClick={resetFilters}>{t("FILTER_RESET")}</Button>
          </Col>
          <Col span={24}>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
              {t("FILTER_PRESETS_LABEL")}
            </Typography.Text>
            <Space size={[8, 8]} wrap>
              {providerOpsAuditPresets.map((preset) => (
                <Button
                  key={preset.key}
                  size="small"
                  type={preset.key === presetKey ? "primary" : "default"}
                  onClick={() => applyPreset(preset)}
                >
                  {t(preset.labelKey)}
                </Button>
              ))}
            </Space>
          </Col>
        </Row>
      </Card>
      <AuditLogsList
        data={records}
        additionalColumns={columns}
        pagination={paginationResponse}
        isLoading={isLoading}
        handleTableChange={handleTableChange}
      />
    </>
  );
};

export default AuditLogsContainer;
