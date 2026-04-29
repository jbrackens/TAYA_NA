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
    } catch {
      message.error("Failed to load markets");
    } finally {
      setLoading(false);
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
    } catch {
      message.error("Failed to create market");
    }
  }

  async function handleLifecycle(
    marketId: string,
    action: MarketLifecycleAction,
  ) {
    try {
      await predictionClient.transitionMarketLifecycle(
        marketId,
        action,
        `Admin: ${action}`,
      );
      message.success(`Market ${action}`);
      loadData();
    } catch {
      message.error(`Failed to ${action} market`);
    }
  }

  const columns = [
    { title: "Ticker", dataIndex: "ticker", key: "ticker", width: 160 },
    { title: "Title", dataIndex: "title", key: "title", ellipsis: true },
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
                onClick={() => handleLifecycle(record.id, "halt")}
              >
                Halt
              </Button>
              <Button
                size="small"
                onClick={() => handleLifecycle(record.id, "close")}
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
