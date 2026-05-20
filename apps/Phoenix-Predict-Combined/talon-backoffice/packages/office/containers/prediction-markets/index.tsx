import React, { useEffect, useState } from "react";
import {
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
  DatePicker,
  message,
} from "antd";
import PageHeader from "../../components/layout/page-header";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import type {
  Category,
  PredictionMarket,
  MarketLifecycleAction,
  CollateralDriftAlert,
} from "@phoenix-ui/api-client/src/prediction-types";

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
};

const formatUsd = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function PredictionMarketsContainer() {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  // Drift alerts keyed by marketId so the table render can lookup in O(1).
  // Empty until first load completes; treated as "no drift" until then.
  const [driftByMarket, setDriftByMarket] = useState<
    Record<string, CollateralDriftAlert>
  >({});
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mkts, cats] = await Promise.all([
        predictionClient.getMarkets({ pageSize: 100 }),
        predictionClient.getCategories(),
      ]);
      setMarkets(mkts.data || []);
      setCategories(cats || []);
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
      const settlementParams = values.settlementParams
        ? (JSON.parse(values.settlementParams as string) as Record<
            string,
            unknown
          >)
        : undefined;
      await predictionClient.createMarket({
        eventId: values.eventId as string,
        ticker: values.ticker as string,
        title: values.title as string,
        description: values.description as string | undefined,
        settlementSourceKey: values.settlementSourceKey as string,
        settlementRule: values.settlementRule as string,
        settlementParams,
        closeAt: values.closeAt as string,
        ammLiquidityParam: (values.ammLiquidityParam as number) || 100,
        feeRateBps: (values.feeRateBps as number) || 0,
      });
      message.success("Market created");
      setCreateOpen(false);
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
   * Halt and Close are destructive: halting a live market mid-trading
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
    action: "halt" | "close",
  ) {
    let reason = "";
    const verb = action === "halt" ? "Halt" : "Close";
    const consequence =
      action === "halt"
        ? "New orders blocked. Resting orders stay until you resume or close."
        : "Trading stops permanently. Market enters the settlement queue.";
    Modal.confirm({
      title: `${verb} ${market.ticker}?`,
      width: 520,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>{consequence}</p>
          <p
            style={{
              marginBottom: 8,
              fontSize: 12,
              color: "var(--t3, #8b8378)",
            }}
          >
            Reason is written to the lifecycle audit log.
          </p>
          <TextArea
            rows={3}
            placeholder={
              action === "halt"
                ? "e.g. Settlement source disputed; pausing pending review"
                : "e.g. Event resolved; routing to settlement"
            }
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        </div>
      ),
      okText: `${verb} market`,
      okButtonProps: { danger: action === "halt" },
      cancelText: "Cancel",
      onOk: () => handleLifecycle(market.id, action, reason),
    });
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
        } · max drift ${formatUsd(Math.abs(drift.maxDriftCents))} · ${drift.latestReason || "see ledger"}`;
        return (
          <Space size={6}>
            <Text>{ticker}</Text>
            <Tooltip title={tip}>
              <Tag color="red" style={{ marginLeft: 0 }}>
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
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status] || "default"}>{status}</Tag>
      ),
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
      dataIndex: "yesPriceCents",
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
      dataIndex: "volumeCents",
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
          {formatUsd(v)}
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
            <Button
              size="small"
              type="primary"
              onClick={() => handleLifecycle(record.id, "open")}
            >
              Open
            </Button>
          )}
          {record.status === "open" && (
            <>
              <Button
                size="small"
                danger
                onClick={() => confirmLifecycle(record, "halt")}
              >
                Halt
              </Button>
              <Button
                size="small"
                onClick={() => confirmLifecycle(record, "close")}
              >
                Close
              </Button>
            </>
          )}
          {record.status === "halted" && (
            <Button
              size="small"
              type="primary"
              onClick={() => handleLifecycle(record.id, "open")}
            >
              Resume
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Prediction Markets" />
      <Card>
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 16 }}
        >
          <Col>
            <Text type="secondary">{markets.length} markets</Text>
          </Col>
          <Col>
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              Create Market
            </Button>
          </Col>
        </Row>
        <Table
          dataSource={markets}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="Create Prediction Market"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="eventId"
            label="Event ID"
            rules={[{ required: true }]}
          >
            <Input placeholder="UUID of the parent event" />
          </Form.Item>
          <Form.Item name="ticker" label="Ticker" rules={[{ required: true }]}>
            <Input placeholder="e.g., BTC-100K-APR26" />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Will Bitcoin exceed $100K by April 30?" />
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
                  <Select.Option value="api-feed-crypto">
                    Crypto Feed (CoinGecko)
                  </Select.Option>
                  <Select.Option value="api-feed-sports">
                    Sports Feed
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
                  <Select.Option value="price_above">
                    Price Above Threshold
                  </Select.Option>
                  <Select.Option value="price_below">
                    Price Below Threshold
                  </Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="settlementParams" label="Settlement Params (JSON)">
            <TextArea
              rows={2}
              placeholder='{"asset": "bitcoin", "threshold": 100000}'
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="ammLiquidityParam"
                label="AMM Liquidity (b)"
                initialValue={100}
              >
                <InputNumber min={1} max={10000} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="feeRateBps" label="Fee (bps)" initialValue={0}>
                <InputNumber min={0} max={1000} style={{ width: "100%" }} />
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
    </>
  );
}
