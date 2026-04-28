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
import { adminApi } from "../../services/api/admin-api";
import { Method } from "@phoenix-ui/utils";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Market {
  id: string;
  ticker: string;
  title: string;
  status: string;
  yesPriceCents: number;
  noPriceCents: number;
  volumeCents: number;
  openInterestCents: number;
  closeAt: string;
  settlementSourceKey: string;
  settlementRule: string;
}

interface Category {
  id: string;
  slug: string;
  name: string;
}

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
  const api = adminApi;
  const [markets, setMarkets] = useState<Market[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
        api.request({
          url: "/api/v1/markets?pageSize=100",
          method: Method.GET,
        }),
        api.request({ url: "/api/v1/categories", method: Method.GET }),
      ]);
      setMarkets(mkts?.data || []);
      setCategories(cats || []);
    } catch {
      message.error("Failed to load markets");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(values: Record<string, unknown>) {
    try {
      await api.request({
        url: "/api/v1/admin/markets/",
        method: Method.POST,
        data: {
          eventId: values.eventId,
          ticker: values.ticker,
          title: values.title,
          description: values.description,
          settlementSourceKey: values.settlementSourceKey,
          settlementRule: values.settlementRule,
          settlementParams: values.settlementParams
            ? JSON.parse(values.settlementParams as string)
            : {},
          closeAt: values.closeAt,
          ammLiquidityParam: values.ammLiquidityParam || 100,
          feeRateBps: values.feeRateBps || 0,
        },
      });
      message.success("Market created");
      setCreateOpen(false);
      form.resetFields();
      loadData();
    } catch {
      message.error("Failed to create market");
    }
  }

  async function handleLifecycle(marketId: string, action: string) {
    try {
      await api.request({
        url: `/api/v1/admin/markets/${marketId}/lifecycle/${action}`,
        method: Method.POST,
        data: { reason: `Admin: ${action}` },
      });
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
      render: (_: unknown, record: Market) => (
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
                onClick={() => handleLifecycle(record.id, "halted")}
              >
                Halt
              </Button>
              <Button
                size="small"
                onClick={() => handleLifecycle(record.id, "closed")}
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
