import { useEffect, useState } from "react";
import { DownloadOutlined, EditOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import PageHeader from "../../components/layout/page-header";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import { describeTapTradeMarketLifecycle } from "@taptrade-ui/api-client/src/prediction-types";
import type {
  Category,
  PredictionMarket,
  PredictionEvent,
  MarketLifecycleAction,
  CollateralDriftAlert,
  PredictionMarketLifecycleEvent,
} from "@taptrade-ui/api-client/src/prediction-types";
import DraftFromArticleModal from "./DraftFromArticleModal";
import CreateEventModal from "./CreateEventModal";
import type { MarketCandidate } from "../../lib/ai/types";

const { Text } = Typography;
const { TextArea } = Input;

const predictionClient = createPredictionClient();

const statusColors: Record<string, string> = {
  unopened: "default",
  open: "processing",
  halted: "warning",
  closed: "orange",
  settled: "success",
  voided: "error",
  proposed_resolution: "purple",
  disputed: "volcano",
};

const formatPoints = (points: number) =>
  `${points.toLocaleString(undefined, { maximumFractionDigits: 0 })} pts`;

function formatDateTimeLocal(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  return date.toISOString().slice(0, 16);
}

function parseSettlementParams(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "string" || !value.trim()) return undefined;
  return JSON.parse(value) as Record<string, unknown>;
}

function dateTimeLocalToApi(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return raw;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    return `${raw}:00Z`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) {
    return `${raw}Z`;
  }
  return raw;
}

// Suggest a ticker from a title: uppercase slug + a short random suffix so the
// operator gets a unique-ish starting point (the gateway enforces uniqueness).
function suggestTicker(title: string): string {
  const slug = title
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${slug || "MKT"}-${suffix}`;
}

export default function PredictionMarketsContainer() {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<PredictionEvent[]>([]);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [articleSourceId, setArticleSourceId] = useState<string | undefined>(
    undefined,
  );
  const [aiGenerationLogIds, setAiGenerationLogIds] = useState<string[]>([]);
  // Drift alerts keyed by marketId so the table render can lookup in O(1).
  // Empty until first load completes; treated as "no drift" until then.
  const [driftByMarket, setDriftByMarket] = useState<
    Record<string, CollateralDriftAlert>
  >({});
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editMarket, setEditMarket] = useState<PredictionMarket | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  // P3-07 per-market jurisdiction overlay editor (null market = modal closed).
  const [jurisForm] = Form.useForm();
  const [jurisMarket, setJurisMarket] = useState<PredictionMarket | null>(null);
  const [jurisLoading, setJurisLoading] = useState(false);
  const [jurisSaving, setJurisSaving] = useState(false);
  const [lifecycleAuditMarket, setLifecycleAuditMarket] =
    useState<PredictionMarket | null>(null);
  const [lifecycleAuditRows, setLifecycleAuditRows] = useState<
    PredictionMarketLifecycleEvent[]
  >([]);
  const [lifecycleAuditLoading, setLifecycleAuditLoading] = useState(false);
  const [lifecycleAuditExporting, setLifecycleAuditExporting] = useState(false);
  const [adminMarketsExporting, setAdminMarketsExporting] = useState(false);
  // `App.useApp()` returns the contextual message/modal handles instead of
  // the top-level statics — required by v5 for theme-aware rendering and
  // silences the "Static function can not consume context" dev warning.
  const { message, modal } = App.useApp();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mkts, cats, evts] = await Promise.all([
        // Admin list includes pre-launch draft markets so operators can open
        // or cancel them before they appear in public discovery.
        predictionClient.getAdminMarkets({ pageSize: 100 }),
        predictionClient.getCategories(),
        predictionClient.getEvents({ pageSize: 100 }),
      ]);
      setMarkets(mkts.data || []);
      setCategories(cats || []);
      setEvents(evts.data || []);
    } catch (err: unknown) {
      // Surface the gateway error verbatim so admins can act on it
      // (auth expired, schema mismatch, etc.) instead of guessing
      // why a generic "Failed to load markets" toast appeared.
      const detail =
        err instanceof Error ? err.message : "Failed to load markets";
      message.error(detail);
    } finally {
      setLoading(false);
    }

    // Drift alerts run as a follow-up so a 404 (gateway pre-rebuild)
    // doesn't fail the main markets load. Quiet failure on the row badge
    // is fine — it just won't render the warning indicator.
    try {
      const alerts = await predictionClient.getDriftAlerts("24h");
      const byId: Record<string, CollateralDriftAlert> = {};
      for (const a of alerts.data) {
        byId[a.marketId] = a;
      }
      setDriftByMarket(byId);
    } catch {
      // Silent — likely 404 on older gateway builds. Row badge just
      // won't appear; nothing else degrades.
    }
  }

  async function handleCreate(values: Record<string, unknown>) {
    try {
      const settlementParams = parseSettlementParams(values.settlementParams);
      await predictionClient.createMarket({
        eventId: values.eventId as string,
        ticker: values.ticker as string,
        title: values.title as string,
        description: values.description as string | undefined,
        settlementSourceKey: values.settlementSourceKey as string,
        settlementRule: values.settlementRule as string,
        settlementParams,
        closeAt: dateTimeLocalToApi(values.closeAt),
        ammLiquidityParam: (values.ammLiquidityParam as number) || 100,
        feeRateBps: (values.feeRateBps as number) || 0,
        articleSourceId,
        aiGenerationLogIds,
      });
      message.success("Market created");
      setCreateOpen(false);
      setArticleSourceId(undefined);
      setAiGenerationLogIds([]);
      form.resetFields();
      loadData();
    } catch (err: unknown) {
      // Surface JSON parse errors from settlementParams + gateway 4xx
      // (e.g. "ticker already exists") instead of a generic toast.
      const detail =
        err instanceof Error ? err.message : "Failed to create market";
      message.error(detail);
    }
  }

  function openEditMarket(market: PredictionMarket) {
    setEditMarket(market);
    editForm.setFieldsValue({
      eventId: market.eventId,
      ticker: market.ticker,
      title: market.title,
      description: market.description,
      settlementSourceKey: market.settlementSourceKey || "admin-manual",
      settlementRule: market.settlementRule || "binary_outcome",
      settlementParams: market.settlementParams
        ? JSON.stringify(market.settlementParams, null, 2)
        : undefined,
      closeAt: formatDateTimeLocal(market.closeAt),
      feeRateBps: market.feeRateBps ?? 0,
      ammLiquidityParam: market.ammLiquidityParam ?? 100,
      ammSubsidyPoints: market.ammSubsidyPoints,
    });
  }

  async function handleEdit(values: Record<string, unknown>) {
    if (!editMarket) return;
    setEditSaving(true);
    try {
      const settlementParams = parseSettlementParams(values.settlementParams);
      await predictionClient.updateMarket(editMarket.id, {
        eventId: editMarket.eventId,
        ticker: editMarket.ticker,
        title: values.title as string,
        description: values.description as string | undefined,
        settlementSourceKey: values.settlementSourceKey as string,
        settlementRule: values.settlementRule as string,
        settlementParams,
        closeAt: dateTimeLocalToApi(values.closeAt),
        feeRateBps: (values.feeRateBps as number) ?? 0,
        ammLiquidityParam: (values.ammLiquidityParam as number) ?? 100,
        ammSubsidyPoints: values.ammSubsidyPoints as
          | number
          | undefined,
      });
      message.success("Market edited");
      setEditMarket(null);
      editForm.resetFields();
      loadData();
    } catch (err: unknown) {
      const detail =
        err instanceof Error ? err.message : "Failed to edit market";
      message.error(detail);
    } finally {
      setEditSaving(false);
    }
  }

  // Prefill the existing Create-Market form from an AI-drafted candidate, then
  // open the create modal so the operator reviews/edits before submitting.
  // News markets resolve manually, so source/rule are fixed to admin-manual;
  // the AI resolution criteria/sources ride along in settlementParams.
  function prefillFromCandidate(
    candidate: MarketCandidate,
    sourceId?: string,
    generationLogIds: string[] = [],
  ) {
    setDraftOpen(false);
    setArticleSourceId(sourceId);
    setAiGenerationLogIds(generationLogIds);
    form.setFieldsValue({
      title: candidate.marketTitle,
      description: candidate.marketQuestion,
      ticker: suggestTicker(candidate.marketTitle),
      settlementSourceKey: "admin-manual",
      settlementRule: "binary_outcome",
      settlementParams: JSON.stringify(
        {
          resolutionCriteria: candidate.resolutionCriteria,
          resolutionSources: candidate.resolutionSources,
          riskLevel: candidate.riskLevel,
          riskFlags: candidate.riskFlags,
          qualityScores: candidate.qualityScores,
        },
        null,
        2,
      ),
      // datetime-local wants "YYYY-MM-DDTHH:mm" — trim the ISO string.
      closeAt: candidate.proposedCloseTime.slice(0, 16),
    });
    setCreateOpen(true);
  }

  function handleEventCreated(event: PredictionEvent) {
    setCreateEventOpen(false);
    setEvents((prev) => [event, ...prev]);
    form.setFieldsValue({ eventId: event.id });
  }

  async function handleLifecycle(
    marketId: string,
    action: MarketLifecycleAction,
    reasonOverride?: string,
  ) {
    try {
      await predictionClient.transitionMarketLifecycle(
        marketId,
        action,
        reasonOverride && reasonOverride.trim()
          ? reasonOverride.trim()
          : `Admin: ${action}`,
      );
      message.success(`Market ${action}`);
      loadData();
    } catch (err: unknown) {
      const detail =
        err instanceof Error ? err.message : `Failed to ${action} market`;
      message.error(detail);
    }
  }

  /**
   * Pause, Close, and Invalidate are destructive: pausing a live market mid-trading
   * blocks new orders and leaves resting bids/asks dangling, and Close
   * is a one-way transition into the settlement queue. Both should
   * require an explicit confirm + reason for the audit log. Open and
   * Resume are constructive (no user-visible loss) and stay one-click.
   *
   * The reason captured here lands in the lifecycle event ledger via
   * `transitionMarketLifecycle(marketId, action, reason)`. Admins should
   * write something a regulator can read 6 months later: "MM agreement
   * expired", "Polymarket settlement source disagreed", etc.
   */
  function confirmLifecycle(
    market: PredictionMarket,
    action: "halt" | "close" | "void",
  ) {
    let reason = "";
    const labels = {
      halt: {
        verb: "Pause",
        consequence:
          "New orders blocked. Resting orders stay until you resume or close.",
        placeholder: "e.g. Settlement source disputed; pausing pending review",
      },
      close: {
        verb: "Close",
        consequence:
          "Trading stops permanently. Market enters the settlement queue.",
        placeholder: "e.g. Event resolved; routing to settlement",
      },
      void: {
        verb: "Invalidate",
        consequence:
          "Market is canceled or invalidated. Locked points are returned at entry cost.",
        placeholder: "e.g. Resolution source invalid; returning locked points",
      },
    }[action];
    modal.confirm({
      title: `${labels.verb} ${market.ticker}?`,
      width: 520,
      content: (
        <div>
          <p className="mb-2">{labels.consequence}</p>
          <p className="mb-2 text-xs text-[var(--t3,#8b8378)]">
            Reason is written to the lifecycle audit log.
          </p>
          <TextArea
            rows={3}
            placeholder={labels.placeholder}
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        </div>
      ),
      okText: `${labels.verb} market`,
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: () => handleLifecycle(market.id, action, reason),
    });
  }

  // P3-07: load a market's current overlay into the modal form, pre-filling
  // mode + countries (or "none" when there is no overlay / the read fails).
  async function openJurisdiction(market: PredictionMarket) {
    setJurisMarket(market);
    setJurisLoading(true);
    jurisForm.setFieldsValue({ mode: "none", countries: [] });
    try {
      const { policy } = await predictionClient.getMarketJurisdiction(
        market.id,
      );
      jurisForm.setFieldsValue({
        mode: policy?.mode ?? "none",
        countries: policy?.countries ?? [],
      });
    } catch (err: unknown) {
      message.error(
        err instanceof Error
          ? err.message
          : "Failed to load the current jurisdiction policy",
      );
    } finally {
      setJurisLoading(false);
    }
  }

  // "none" clears the overlay (the gateway treats an empty body as clear);
  // allow/deny require a non-empty country list. Codes are upper-cased here so
  // the stored policy is canonical (the gate matches case-insensitively).
  async function handleJurisdictionSave(values: {
    mode: "none" | "allow" | "deny";
    countries?: string[];
  }) {
    if (!jurisMarket) return;
    const countries = (values.countries ?? [])
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (values.mode !== "none" && countries.length === 0) {
      message.error("Add at least one country, or choose “No restriction”.");
      return;
    }
    setJurisSaving(true);
    try {
      const policy =
        values.mode === "none" ? null : { mode: values.mode, countries };
      await predictionClient.setMarketJurisdiction(jurisMarket.id, policy);
      message.success(
        policy ? "Jurisdiction policy saved" : "Jurisdiction overlay cleared",
      );
      setJurisMarket(null);
    } catch (err: unknown) {
      message.error(
        err instanceof Error
          ? err.message
          : "Failed to save the jurisdiction policy",
      );
    } finally {
      setJurisSaving(false);
    }
  }

  async function openLifecycleAudit(market: PredictionMarket) {
    setLifecycleAuditMarket(market);
    setLifecycleAuditLoading(true);
    try {
      const audit = await predictionClient.getMarketLifecycleAudit(market.id);
      setLifecycleAuditRows(audit.data || []);
    } catch (err: unknown) {
      setLifecycleAuditRows([]);
      message.error(
        err instanceof Error ? err.message : "Failed to load lifecycle audit",
      );
    } finally {
      setLifecycleAuditLoading(false);
    }
  }

  async function exportLifecycleAudit() {
    if (!lifecycleAuditMarket || typeof window === "undefined") return;
    setLifecycleAuditExporting(true);
    try {
      const csv = await predictionClient.exportMarketLifecycleAudit(
        lifecycleAuditMarket.id,
      );
      const url = window.URL.createObjectURL(
        new Blob([csv], { type: "text/csv" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Market Lifecycle - ${lifecycleAuditMarket.ticker}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success("Lifecycle audit exported");
    } catch (err: unknown) {
      message.error(
        err instanceof Error ? err.message : "Failed to export lifecycle audit",
      );
    } finally {
      setLifecycleAuditExporting(false);
    }
  }

  async function exportAdminMarkets() {
    if (typeof window === "undefined") return;
    setAdminMarketsExporting(true);
    try {
      const csv = await predictionClient.exportAdminMarkets({ pageSize: 100 });
      const url = window.URL.createObjectURL(
        new Blob([csv], { type: "text/csv" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Prediction Markets.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success("Market data exported");
    } catch (err: unknown) {
      message.error(
        err instanceof Error ? err.message : "Failed to export market data",
      );
    } finally {
      setAdminMarketsExporting(false);
    }
  }

  const columns = [
    {
      title: "Ticker",
      dataIndex: "ticker",
      key: "ticker",
      width: 200,
      render: (ticker: string, record: PredictionMarket) => {
        const drift = driftByMarket[record.id];
        if (!drift) {
          return <Text>{ticker}</Text>;
        }
        // Drift detected within last 24h. Show a red dot with tooltip;
        // adjustmentCount and maxDrift drive the urgency message.
        const tip = `${drift.adjustmentCount} adjustment${
          drift.adjustmentCount === 1 ? "" : "s"
        } · max drift ${formatPoints(Math.abs(drift.maxDriftPoints))} · ${drift.latestReason || "see ledger"}`;
        return (
          <Space size={6}>
            <Text>{ticker}</Text>
            <Tooltip title={tip}>
              <Tag color="red" className="!ml-0">
                drift
              </Tag>
            </Tooltip>
          </Space>
        );
      },
    },
    {
      // Title column was truncating to ~3-6 chars at narrow widths
      // because Antd allocates remaining space after fixed-width
      // columns and the rest of the row is greedy. Give Title a
      // generous explicit width AND keep ellipsis with a hover tooltip
      // so the full title is always reachable.
      title: "Title",
      dataIndex: "title",
      key: "title",
      width: 360,
      ellipsis: { showTitle: false } as const,
      render: (title: string) => (
        <Tooltip placement="topLeft" title={title}>
          <span>{title}</span>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: string, record: PredictionMarket) => {
        const lifecycle =
          record.taptradeLifecycle || describeTapTradeMarketLifecycle(status);
        return (
          <Tooltip title={lifecycle.description}>
            <Tag color={statusColors[status] || "default"}>
              {lifecycle.label}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      // Exchange engine: 'order_book' (real CLOB matching) vs 'amm' (legacy
      // LMSR). New markets default to order_book per migration 019; existing
      // markets stay AMM until manually flipped. Surfaces here so trading
      // ops can spot pre-launch markets at a glance.
      title: "Engine",
      dataIndex: "executionMode",
      key: "executionMode",
      width: 96,
      render: (mode?: string) => {
        const m = mode || "amm";
        const color = m === "order_book" ? "geekblue" : "default";
        const label = m === "order_book" ? "book" : "amm";
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "YES",
      dataIndex: "yesPricePoints",
      key: "yes",
      width: 70,
      render: (v: number) => (
        <Text
          strong
          style={{
            color: "var(--yes-text, #1a6849)",
            fontFamily:
              "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {v}%
        </Text>
      ),
    },
    {
      title: "Volume",
      dataIndex: "volumePoints",
      key: "vol",
      width: 100,
      render: (v: number) => (
        <span
          style={{
            fontFamily:
              "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
            fontVariantNumeric: "tabular-nums",
            color: "var(--t1, #1a1a1a)",
          }}
        >
          {formatPoints(v)}
        </span>
      ),
    },
    {
      title: "Closes",
      dataIndex: "closeAt",
      key: "close",
      width: 140,
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: "Source",
      dataIndex: "settlementSourceKey",
      key: "source",
      width: 120,
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_: unknown, record: PredictionMarket) => (
        <Space size="small">
          {record.status === "unopened" && (
            <>
              <Button
                size="small"
                type="primary"
                onClick={() => handleLifecycle(record.id, "open")}
              >
                Open
              </Button>
              <Button
                size="small"
                danger
                onClick={() => confirmLifecycle(record, "void")}
              >
                Cancel
              </Button>
            </>
          )}
          {record.status === "open" && (
            <>
              <Button
                size="small"
                danger
                onClick={() => confirmLifecycle(record, "halt")}
              >
                Pause
              </Button>
              <Button
                size="small"
                onClick={() => confirmLifecycle(record, "close")}
              >
                Close
              </Button>
              <Button
                size="small"
                danger
                onClick={() => confirmLifecycle(record, "void")}
              >
                Invalidate
              </Button>
            </>
          )}
          {record.status === "halted" && (
            <>
              <Button
                size="small"
                type="primary"
                onClick={() => handleLifecycle(record.id, "open")}
              >
                Resume
              </Button>
              <Button
                size="small"
                onClick={() => confirmLifecycle(record, "close")}
              >
                Close
              </Button>
              <Button
                size="small"
                danger
                onClick={() => confirmLifecycle(record, "void")}
              >
                Invalidate
              </Button>
            </>
          )}
          {(record.status === "closed" ||
            record.status === "proposed_resolution" ||
            record.status === "disputed") && (
            <Button
              size="small"
              danger
              onClick={() => confirmLifecycle(record, "void")}
            >
              Invalidate
            </Button>
          )}
          <Button
            size="small"
            icon={<EditOutlined />}
            disabled={record.status === "settled" || record.status === "voided"}
            onClick={() => openEditMarket(record)}
          >
            Edit
          </Button>
          <Button size="small" onClick={() => openJurisdiction(record)}>
            Region
          </Button>
          <Button size="small" onClick={() => openLifecycleAudit(record)}>
            Audit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Prediction Markets" />
      <Card>
        <Row justify="space-between" align="middle" className="mb-4">
          <Col>
            <Text type="secondary">{markets.length} markets</Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<DownloadOutlined />}
                loading={adminMarketsExporting}
                onClick={exportAdminMarkets}
              >
                Export CSV
              </Button>
              <Button onClick={() => setDraftOpen(true)}>
                Draft from article
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  setArticleSourceId(undefined);
                  setAiGenerationLogIds([]);
                  setCreateOpen(true);
                }}
              >
                Create Market
              </Button>
            </Space>
          </Col>
        </Row>
        <Table
          dataSource={markets}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 1366 }}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="Create Prediction Market"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setArticleSourceId(undefined);
          setAiGenerationLogIds([]);
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="eventId" label="Event" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select the parent event"
              optionFilterProp="label"
              options={events.map((e) => ({ value: e.id, label: e.title }))}
              notFoundContent="No events yet — use Create new event below"
            />
          </Form.Item>
          <Button
            type="link"
            size="small"
            className="!-mt-2 !mb-2 !p-0"
            onClick={() => setCreateEventOpen(true)}
          >
            + Create new event
          </Button>
          <Form.Item name="ticker" label="Ticker" rules={[{ required: true }]}>
            <Input placeholder="e.g., MLBB-FINAL-G1" />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Will this MLBB team win game one?" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="settlementSourceKey"
                label="Settlement Source"
                rules={[{ required: true }]}
              >
                <Select placeholder="Select source">
                  <Select.Option value="admin-manual">
                    Admin Manual
                  </Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="settlementRule"
                label="Settlement Rule"
                rules={[{ required: true }]}
              >
                <Select placeholder="Select rule">
                  <Select.Option value="binary_outcome">
                    Binary Outcome
                  </Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="settlementParams" label="Settlement Params (JSON)">
            <TextArea
              rows={2}
              placeholder='{"source":"official rules","criteria":"YES if the listed outcome occurs"}'
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="ammLiquidityParam"
                label="AMM Liquidity (b)"
                initialValue={100}
              >
                <InputNumber min={1} max={10000} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="feeRateBps" label="Fee (bps)" initialValue={0}>
                <InputNumber min={0} max={1000} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="closeAt"
                label="Close Date"
                rules={[{ required: true }]}
              >
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={
          editMarket ? `Edit Market — ${editMarket.ticker}` : "Edit Market"
        }
        open={editMarket !== null}
        onCancel={() => {
          setEditMarket(null);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        confirmLoading={editSaving}
        okText="Save edits"
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="eventId" label="Event">
            <Select
              disabled
              options={events.map((e) => ({ value: e.id, label: e.title }))}
            />
          </Form.Item>
          <Form.Item name="ticker" label="Ticker">
            <Input disabled />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="settlementSourceKey"
                label="Settlement Source"
                rules={[{ required: true }]}
              >
                <Select placeholder="Select source">
                  <Select.Option value="admin-manual">
                    Admin Manual
                  </Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="settlementRule"
                label="Settlement Rule"
                rules={[{ required: true }]}
              >
                <Select placeholder="Select rule">
                  <Select.Option value="binary_outcome">
                    Binary Outcome
                  </Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="settlementParams" label="Settlement Params (JSON)">
            <TextArea rows={3} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="ammLiquidityParam" label="AMM Liquidity (b)">
                <InputNumber min={1} max={10000} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="feeRateBps" label="Fee (bps)">
                <InputNumber min={0} max={1000} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="closeAt"
                label="Close Date"
                rules={[{ required: true }]}
              >
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <DraftFromArticleModal
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        onUse={prefillFromCandidate}
      />

      <CreateEventModal
        open={createEventOpen}
        onClose={() => setCreateEventOpen(false)}
        categories={categories}
        onCreated={handleEventCreated}
      />

      <Modal
        title={
          jurisMarket ? `Jurisdiction — ${jurisMarket.ticker}` : "Jurisdiction"
        }
        open={jurisMarket !== null}
        onCancel={() => setJurisMarket(null)}
        onOk={() => jurisForm.submit()}
        confirmLoading={jurisSaving}
        okText="Save"
      >
        <Text type="secondary" className="mb-3 block">
          Optional per-market country overlay. It is evaluated AFTER the global
          geo gate, so it can only further restrict access — never widen it.
          Choose “No restriction” to clear the overlay for this market.
        </Text>
        <Form
          form={jurisForm}
          layout="vertical"
          onFinish={handleJurisdictionSave}
          disabled={jurisLoading}
        >
          <Form.Item name="mode" label="Mode" initialValue="none">
            <Select
              options={[
                { value: "none", label: "No restriction (clear overlay)" },
                { value: "allow", label: "Allow only these countries" },
                { value: "deny", label: "Deny these countries" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="countries"
            label="Countries (ISO-3166 alpha-2)"
            tooltip="Two-letter codes, e.g. US, CA, GB. Type and press enter, or paste comma-separated."
          >
            <Select
              mode="tags"
              tokenSeparators={[",", " "]}
              placeholder="US, CA, GB"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          lifecycleAuditMarket
            ? `Lifecycle Audit — ${lifecycleAuditMarket.ticker}`
            : "Lifecycle Audit"
        }
        open={lifecycleAuditMarket !== null}
        onCancel={() => {
          setLifecycleAuditMarket(null);
          setLifecycleAuditRows([]);
        }}
        footer={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              loading={lifecycleAuditExporting}
              disabled={!lifecycleAuditMarket}
              onClick={exportLifecycleAudit}
            >
              Export CSV
            </Button>
            <Button
              onClick={() => {
                setLifecycleAuditMarket(null);
                setLifecycleAuditRows([]);
              }}
            >
              Close
            </Button>
          </Space>
        }
        width={820}
      >
        <Table
          dataSource={lifecycleAuditRows}
          rowKey={(record) =>
            record.id || `${record.eventType}-${record.occurredAt}`
          }
          loading={lifecycleAuditLoading}
          size="small"
          pagination={false}
          locale={{ emptyText: "No lifecycle audit events yet" }}
          columns={[
            {
              title: "Stage",
              key: "stage",
              width: 140,
              render: (_: unknown, record: PredictionMarketLifecycleEvent) => (
                <Tag color={statusColors[`${record.eventType}`] || "default"}>
                  {record.taptradeLifecycle?.label ||
                    describeTapTradeMarketLifecycle(record.eventType).label}
                </Tag>
              ),
            },
            {
              title: "Reason",
              dataIndex: "reason",
              key: "reason",
              ellipsis: true,
              render: (reason?: string) => reason || "No reason recorded",
            },
            {
              title: "Actor",
              key: "actor",
              width: 180,
              render: (_: unknown, record: PredictionMarketLifecycleEvent) =>
                record.actorId || record.actorType || "system",
            },
            {
              title: "Occurred",
              dataIndex: "occurredAt",
              key: "occurredAt",
              width: 180,
              render: (value: string) =>
                value ? new Date(value).toLocaleString() : "-",
            },
          ]}
        />
      </Modal>
    </>
  );
}
