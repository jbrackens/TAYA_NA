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
      const result = await predictionClient.settleMarket(selectedMarket.id, {
        result: values.result as "yes" | "no",
        attestationSource: (values.attestationSource as string) || "admin",
        attestationData,
        reason: values.reason as string | undefined,
      });
      const payoutCount = result.payouts?.length || 0;
      message.success(
        `Market settled: ${selectedMarket.ticker} → ${values.result} (${payoutCount} payouts)`,
      );
      setSettleOpen(false);
      setSelectedMarket(null);
      form.resetFields();
      loadData();
    } catch {
      message.error("Settlement failed");
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
        open={settleOpen}
        onCancel={() => {
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
        </Form>
      </Modal>
    </>
  );
}
