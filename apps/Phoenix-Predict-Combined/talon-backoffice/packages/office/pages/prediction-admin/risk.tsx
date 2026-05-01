/**
 * Operator risk dashboard for the prediction platform. Surfaces:
 *   - Top user cost-basis concentrations (qty × avg purchase price; a
 *     deposit-concentration signal, not mark-to-market exposure)
 *   - Top market open-interest concentrations
 *   - Settlement aging buckets (closed-but-not-settled markets)
 *   - Money invariants (wallet vs ledger reconciliation, drift signal,
 *     read inside a single REPEATABLE READ snapshot transaction)
 *
 * Backed by GET /api/v1/admin/risk/dashboard. The endpoint may return a
 * partial payload with the X-Risk-Dashboard-Partial header set when one
 * of the four blocks fails — we surface that in a banner so operators
 * know data is degraded. The drift indicator is suppressed when
 * moneyInvariants.computed === false to avoid showing $0 drift on
 * incomplete totals.
 */
import Head from "next/head";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { Layout } from "../../components/layout";
import PageHeader from "../../components/layout/page-header";
import { defaultNamespaces } from "../../providers/translations/defaults";
import { securedPage } from "../../utils/auth";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";

const { Text } = Typography;

interface UserConcentration {
  userId: string;
  costBasisCents: number;
  positionsCount: number;
  marketsCount: number;
}
interface MarketConcentration {
  marketId: string;
  ticker: string;
  title: string;
  status: string;
  openInterestCents: number;
  volumeCents: number;
}
interface AgingMarket {
  marketId: string;
  ticker: string;
  title: string;
  closedAt: string;
  ageMinutes: number;
}
interface SettlementAging {
  computed: boolean;
  bucket0To1h: number;
  bucket1To6h: number;
  bucket6To24h: number;
  bucketOver24h: number;
  totalUnsettled: number;
  oldest: AgingMarket[];
}
interface MoneyInvariants {
  computed: boolean;
  walletBalanceTotalCents: number;
  ledgerReplayBalanceCents: number;
  driftCents: number;
  openPositionsCostBasisCents: number;
  unsettledPayoutLiabilityCents: number;
}
interface Dashboard {
  generatedAt: string;
  userConcentration: UserConcentration[];
  marketConcentration: MarketConcentration[];
  settlementAging: SettlementAging;
  moneyInvariants: MoneyInvariants;
}

const fmtCents = (cents: number): string =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

const statusColor: Record<string, string> = {
  unopened: "default",
  open: "processing",
  halted: "warning",
  closed: "orange",
  settled: "success",
  voided: "error",
};

function PredictionRiskDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [partial, setPartial] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async (): Promise<void> => {
    setRefreshing(true);
    setError(null);
    setPartial(null);
    try {
      const res = await fetch("/api/v1/admin/risk/dashboard", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      const partialHeader = res.headers.get("X-Risk-Dashboard-Partial");
      if (partialHeader) setPartial(partialHeader);
      const json: Dashboard = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  const invariantsComputed = data?.moneyInvariants.computed ?? false;
  const drift = data?.moneyInvariants.driftCents ?? 0;
  const driftHealthy = invariantsComputed && drift === 0;

  return (
    <>
      <Head>
        <title>Risk Dashboard — Admin</title>
      </Head>
      <Layout>
        <PageHeader
          title="Risk Dashboard"
          subTitle="Concentration, settlement aging, and money invariants"
          extra={[
            <Button
              key="refresh"
              onClick={() => void fetchDashboard()}
              loading={refreshing}
              type="primary"
            >
              Refresh
            </Button>,
          ]}
        />

        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="Failed to load risk dashboard"
            description={error}
          />
        )}
        {partial && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="Partial data — one or more metric blocks failed to compute"
            description={partial}
          />
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 80 }}>
            <Spin size="large" />
          </div>
        ) : data ? (
          <>
            {/* Money invariants — most important panel; lead with it. */}
            <Card title="Money Invariants" style={{ marginBottom: 16 }}>
              {!invariantsComputed && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Money invariants snapshot did not complete"
                  description="Drift and totals below are partial / stale and must not be interpreted as a healthy ledger. Refresh to retry."
                />
              )}
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="Wallet Balance Total"
                    value={fmtCents(
                      data.moneyInvariants.walletBalanceTotalCents,
                    )}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Ledger Replay Balance"
                    value={fmtCents(
                      data.moneyInvariants.ledgerReplayBalanceCents,
                    )}
                  />
                </Col>
                <Col span={6}>
                  {invariantsComputed ? (
                    <>
                      <Statistic
                        title="Drift (wallet − ledger)"
                        value={fmtCents(drift)}
                        valueStyle={{
                          color: driftHealthy ? "#3f8600" : "#cf1322",
                          fontWeight: 700,
                        }}
                      />
                      {!driftHealthy && (
                        <Tag color="red" style={{ marginTop: 4 }}>
                          INVARIANT VIOLATION
                        </Tag>
                      )}
                    </>
                  ) : (
                    <Statistic
                      title="Drift (wallet − ledger)"
                      value="—"
                      valueStyle={{ color: "#999" }}
                    />
                  )}
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Unsettled Payout Liability"
                    value={fmtCents(
                      data.moneyInvariants.unsettledPayoutLiabilityCents,
                    )}
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Upper bound: qty × 100¢ on closed-but-unsettled positions.
                  </Text>
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={6}>
                  <Statistic
                    title="Open Positions Cost Basis"
                    value={fmtCents(
                      data.moneyInvariants.openPositionsCostBasisCents,
                    )}
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Cash spent acquiring open positions, not mark-to-market.
                  </Text>
                </Col>
              </Row>
            </Card>

            {/* Settlement aging */}
            <Card title="Settlement Aging" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={4}>
                  <Statistic
                    title="0–1h"
                    value={data.settlementAging.bucket0To1h}
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="1–6h"
                    value={data.settlementAging.bucket1To6h}
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="6–24h"
                    value={data.settlementAging.bucket6To24h}
                    valueStyle={
                      data.settlementAging.bucket6To24h > 0
                        ? { color: "#fa8c16" }
                        : undefined
                    }
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title=">24h"
                    value={data.settlementAging.bucketOver24h}
                    valueStyle={
                      data.settlementAging.bucketOver24h > 0
                        ? { color: "#cf1322", fontWeight: 700 }
                        : undefined
                    }
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Total Unsettled"
                    value={data.settlementAging.totalUnsettled}
                  />
                </Col>
              </Row>
              {data.settlementAging.oldest.length > 0 && (
                <Table
                  size="small"
                  style={{ marginTop: 16 }}
                  rowKey="marketId"
                  pagination={false}
                  dataSource={data.settlementAging.oldest}
                  columns={[
                    { title: "Ticker", dataIndex: "ticker", key: "ticker" },
                    {
                      title: "Market",
                      dataIndex: "title",
                      key: "title",
                      ellipsis: true,
                    },
                    {
                      title: "Closed At",
                      dataIndex: "closedAt",
                      key: "closedAt",
                      render: (v: string) => new Date(v).toLocaleString(),
                    },
                    {
                      title: "Age (min)",
                      dataIndex: "ageMinutes",
                      key: "ageMinutes",
                      render: (v: number) => (
                        <Tag
                          color={v > 1440 ? "red" : v > 360 ? "orange" : "blue"}
                        >
                          {v}
                        </Tag>
                      ),
                    },
                  ]}
                />
              )}
            </Card>

            {/* User concentration */}
            <Card
              title="Top User Cost-Basis Concentration"
              style={{ marginBottom: 16 }}
            >
              <Text
                type="secondary"
                style={{ display: "block", marginBottom: 8 }}
              >
                Cost basis = qty × avg purchase price. Highlights deposit
                concentration; not a mark-to-market exposure metric.
              </Text>
              <Table
                size="small"
                rowKey="userId"
                pagination={false}
                dataSource={data.userConcentration}
                columns={[
                  { title: "User ID", dataIndex: "userId", key: "userId" },
                  {
                    title: "Cost Basis",
                    dataIndex: "costBasisCents",
                    key: "costBasisCents",
                    render: (v: number) => fmtCents(v),
                    align: "right",
                  },
                  {
                    title: "Positions",
                    dataIndex: "positionsCount",
                    key: "positionsCount",
                    align: "right",
                  },
                  {
                    title: "Markets",
                    dataIndex: "marketsCount",
                    key: "marketsCount",
                    align: "right",
                  },
                ]}
              />
            </Card>

            {/* Market concentration */}
            <Card title="Top Market Open Interest" style={{ marginBottom: 16 }}>
              <Table
                size="small"
                rowKey="marketId"
                pagination={false}
                dataSource={data.marketConcentration}
                columns={[
                  { title: "Ticker", dataIndex: "ticker", key: "ticker" },
                  {
                    title: "Market",
                    dataIndex: "title",
                    key: "title",
                    ellipsis: true,
                  },
                  {
                    title: "Status",
                    dataIndex: "status",
                    key: "status",
                    render: (v: string) => (
                      <Tag color={statusColor[v] ?? "default"}>{v}</Tag>
                    ),
                  },
                  {
                    title: "Open Interest",
                    dataIndex: "openInterestCents",
                    key: "openInterestCents",
                    render: (v: number) => fmtCents(v),
                    align: "right",
                  },
                  {
                    title: "Volume",
                    dataIndex: "volumeCents",
                    key: "volumeCents",
                    render: (v: number) => fmtCents(v),
                    align: "right",
                  },
                ]}
              />
            </Card>

            <Text type="secondary">
              Generated at: {new Date(data.generatedAt).toLocaleString()}
            </Text>
          </>
        ) : null}
      </Layout>
    </>
  );
}

PredictionRiskDashboardPage.namespace = "page-prediction-risk";
// Admin-only: this dashboard exposes platform-wide cost-basis
// concentration, money invariants, and unsettled liability totals.
// The backend handler enforces requireAdminRole; the frontend role
// guard must match exactly so non-admins don't see a page that
// always returns 403.
PredictionRiskDashboardPage.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(ctx, { namespacesRequired: [...defaultNamespaces] }, [
    PunterRoleEnum.ADMIN,
  ]);

export default PredictionRiskDashboardPage;
