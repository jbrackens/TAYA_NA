import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import PageHeader from "../../components/layout/page-header";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";

const { Text } = Typography;
const { TextArea } = Input;

const predictionClient = createPredictionClient();

export default function PredictionSettlementsContainer() {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [settleOpen, setSettleOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<PredictionMarket | null>(
    null,
  );
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await predictionClient.getMarkets({
        status: "closed",
        pageSize: 100,
      });
      setMarkets(res.data || []);
    } catch {
      message.error("Failed to load markets");
    } finally {
      setLoading(false);
    }
  }

  function openSettle(market: PredictionMarket) {
    setSelectedMarket(market);
    setSettleOpen(true);
  }

  async function handleSettle(values: Record<string, unknown>) {
    if (!selectedMarket) return;
    try {
      const attestationData = values.attestationData
        ? (JSON.parse(values.attestationData as string) as Record<
            string,
            unknown
          >)
        : undefined;
      const overrideReasonRaw = values.overrideReason as string | undefined;
      const overrideReason = overrideReasonRaw?.trim()
        ? overrideReasonRaw.trim()
        : undefined;
      const result = await predictionClient.settleMarket(selectedMarket.id, {
        result: values.result as "yes" | "no",
        attestationSource: (values.attestationSource as string) || "admin",
        attestationData,
        reason: values.reason as string | undefined,
        // Override flag — gateway requires this if the market has a
        // collateral imbalance (schema 019 CHECK + service-layer guard).
        // Empty string treated as not-supplied so the gateway's all-or-none
        // CHECK passes when no override is intended.
        overrideReason,
      });
      const payoutCount = result.payouts?.length || 0;
      message.success(
        `Market settled: ${selectedMarket.ticker} → ${values.result} (${payoutCount} payouts)`,
      );
      setSettleOpen(false);
      setSelectedMarket(null);
      form.resetFields();
      loadData();
    } catch (err: unknown) {
      // Surface the gateway's error string (often "collateral imbalance —
      // override required") instead of a generic message so the admin
      // knows to fill the override reason and retry.
      const detail = err instanceof Error ? err.message : "Settlement failed";
      message.error(detail);
    }
  }

  const columns = [
    { title: "Ticker", dataIndex: "ticker", key: "ticker", width: 160 },
    { title: "Title", dataIndex: "title", key: "title", ellipsis: true },
    {
      title: "Last YES",
      dataIndex: "yesPriceCents",
      key: "yes",
      width: 80,
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
          ${(v / 100).toLocaleString()}
        </span>
      ),
    },
    {
      title: "Closed",
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
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, record: PredictionMarket) => (
        <Button size="small" type="primary" onClick={() => openSettle(record)}>
          Settle
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Settlement Queue" />
      <Card>
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 16 }}
        >
          <Col>
            <Text type="secondary">
              {markets.length} market{markets.length !== 1 ? "s" : ""} awaiting
              settlement
            </Text>
          </Col>
          <Col>
            <Button onClick={loadData}>Refresh</Button>
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
        title={`Settle: ${selectedMarket?.ticker || ""}`}
        visible={settleOpen}
        onCancel={() => {
          // Reset on cancel so a stale ticker-confirm value from a
          // previous market doesn't leak into the next Settle attempt.
          form.resetFields();
          setSettleOpen(false);
          setSelectedMarket(null);
        }}
        onOk={() => form.submit()}
        okText="Settle Market"
        okButtonProps={{ danger: true }}
      >
        {selectedMarket && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>{selectedMarket.title}</Text>
            <br />
            <Text type="secondary">
              Last YES: {selectedMarket.yesPriceCents}% | Source:{" "}
              {selectedMarket.settlementSourceKey}
            </Text>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleSettle}>
          <Form.Item name="result" label="Outcome" rules={[{ required: true }]}>
            <Select placeholder="Select outcome">
              <Select.Option value="yes">
                <Tag color="green">YES</Tag> — Market resolved in favor
              </Select.Option>
              <Select.Option value="no">
                <Tag color="red">NO</Tag> — Market resolved against
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="attestationSource"
            label="Attestation Source"
            initialValue="admin"
          >
            <Input placeholder="admin" />
          </Form.Item>
          <Form.Item
            name="attestationData"
            label="Attestation Data (JSON, optional)"
          >
            <TextArea
              rows={3}
              placeholder='{"source": "reuters", "article_url": "..."}'
            />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input placeholder="e.g., Official result confirmed by AP" />
          </Form.Item>
          {/*
            Collateral-imbalance override. Required only when the gateway
            detects that prediction_collateral_ledger doesn't match the
            sum of YES/NO positions × 100¢ on this market. If the gateway
            rejects with "override_reason required", admin fills this and
            re-submits. Leaving it empty is the default safe path — the
            gateway will reject if it actually needs an override.
          */}
          <Form.Item
            name="overrideReason"
            label="Override Reason (only if collateral imbalance)"
            help="Required when the gateway flags a collateral mismatch. Otherwise leave empty."
          >
            <TextArea
              rows={2}
              placeholder="e.g., Drift confirmed at $0.12 — investigated, ops approved settlement; ticket OPS-1234"
            />
          </Form.Item>
          {/*
            Settlement is irreversible: payouts are credited atomically
            against the collateral pool and there is no "unsettle" path.
            Require the admin to type the exact ticker (case-sensitive)
            before the OK button accepts the form. Validates against
            selectedMarket.ticker via the rule below — same pattern as
            GitHub's destructive-action confirmations.
          */}
          <Form.Item
            name="confirmTicker"
            label={`Type "${selectedMarket?.ticker || ""}" to confirm`}
            rules={[
              { required: true, message: "Type the ticker to confirm" },
              {
                validator: (_, value) =>
                  value === selectedMarket?.ticker
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(
                          `Must match "${selectedMarket?.ticker || ""}" exactly`,
                        ),
                      ),
              },
            ]}
          >
            <Input
              placeholder={selectedMarket?.ticker || ""}
              autoComplete="off"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
