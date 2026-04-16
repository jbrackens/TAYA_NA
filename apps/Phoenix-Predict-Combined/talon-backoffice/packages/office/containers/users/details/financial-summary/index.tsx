import { useState, useEffect } from "react";
import { TabsUserDetails } from "../index.styled";
import { Tabs, Card, Row, Col, Statistic, Divider } from "antd";
import { IdcardOutlined } from "@ant-design/icons";
import { useTranslation } from "i18n";
import {
  Method,
  FinancialSummary as FinancialSummaryType,
  Id,
} from "@phoenix-ui/utils";
import { useApi } from "../../../../services/api/api-service";

type FinancialSummaryProps = {
  id: Id;
};

type MoneyAmount = { amount: number; currency: string };

type FinancialSummaryWithProductBreakdown = FinancialSummaryType & {
  productBreakdown: {
    sportsbook: {
      openExposure: MoneyAmount;
    };
    prediction: {
      openExposure: MoneyAmount;
      openOrders: number;
      settledOrders: number;
      cancelledOrders: number;
    };
  };
};

const toMoney = (value: any, fallbackCurrency: string): MoneyAmount => {
  if (value && typeof value === "object" && "amount" in value) {
    return value as MoneyAmount;
  }
  return { amount: Number(value) || 0, currency: fallbackCurrency };
};

const normalizeFinancialSummary = (
  raw: any,
): FinancialSummaryWithProductBreakdown => {
  if (!raw || typeof raw !== "object") {
    return raw;
  }
  const currency = raw.currentBalance?.currency || "USD";
  const isGoFormat = "current_balance" in raw || "lifetime_deposits" in raw;
  if (!isGoFormat) {
    return raw as FinancialSummaryWithProductBreakdown;
  }
  const pb = raw.product_breakdown || {};
  const sb = pb.sportsbook || {};
  const pred = pb.prediction || {};
  return {
    currentBalance: toMoney(raw.current_balance, currency),
    openedBets: toMoney(raw.opened_bets, currency),
    pendingWithdrawals: toMoney(raw.pending_withdrawals, currency),
    lifetimeDeposits: toMoney(raw.lifetime_deposits, currency),
    lifetimeWithdrawals: toMoney(raw.lifetime_withdrawals, currency),
    netCash: toMoney(raw.net_cash, currency),
    productBreakdown: {
      sportsbook: {
        openExposure: toMoney(sb.open_exposure, currency),
      },
      prediction: {
        openExposure: toMoney(pred.open_exposure, currency),
        openOrders: pred.open_orders ?? 0,
        settledOrders: pred.settled_orders ?? 0,
        cancelledOrders: pred.cancelled_orders ?? 0,
      },
    },
  } as FinancialSummaryWithProductBreakdown;
};

export const FinancialSummary = ({ id }: FinancialSummaryProps) => {
  const { t } = useTranslation("page-users-details");
  const { TabPane } = Tabs;
  const [financialSummary, setFinancialSummary] = useState<
    FinancialSummaryWithProductBreakdown
  >();

  const [triggerApi, isLoading, response] = useApi(
    "admin/punters/:id/financial-summary",
    Method.GET,
  );

  useEffect(() => {
    if (response.succeeded) {
      setFinancialSummary(normalizeFinancialSummary(response.data));
    }
  }, [response]);

  useEffect(() => {
    const fetchFinancialSummary = async () => {
      try {
        await triggerApi(undefined, {
          id,
        });
      } catch (err) {
        console.error({ err });
      }
    };
    fetchFinancialSummary();
  }, []);

  const profit = financialSummary
    ? financialSummary.lifetimeDeposits.amount -
      financialSummary.pendingWithdrawals.amount -
      financialSummary.lifetimeWithdrawals.amount
    : 0;

  return (
    <TabsUserDetails type="card">
      <TabPane
        tab={
          <span>
            <IdcardOutlined />
            {t("HEADER_CARD_FINANCIAL_SUMMARY")}
          </span>
        }
        key="financialSummary"
      >
        <Card loading={isLoading}>
          <Row gutter={[8, 24]}>
            <Col span={12} role="currentBalance">
              <Statistic
                title={t("HEADER_CARD_FINANCIAL_SUMMARY_CURRENT_BALANCE")}
                value={`${financialSummary?.currentBalance.amount}`}
                prefix="$"
              />
            </Col>
            <Col span={12} role="openedBets">
              <Statistic
                title={t("HEADER_CARD_FINANCIAL_SUMMARY_OPEN_BETS")}
                value={financialSummary?.openedBets.amount}
                prefix="$"
              />
            </Col>
          </Row>
          <Divider orientation="left">
            {t("HEADER_CARD_FINANCIAL_SUMMARY_PRODUCT_BREAKDOWN")}
          </Divider>
          <Row gutter={[8, 24]}>
            <Col span={12} role="lifetimeDeposits">
              <Statistic
                title={t("HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_DEPOSITS")}
                value={`${financialSummary?.lifetimeDeposits.amount}`}
                valueStyle={{ color: "#3f8600" }}
                prefix="$"
              />
            </Col>
            <Col span={12} role="lifetimeWithdrawals">
              <Statistic
                title={t("HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_WITHDRAWALS")}
                value={`${financialSummary?.lifetimeWithdrawals.amount}`}
                valueStyle={{ color: "#cf1322" }}
                prefix="$"
              />
            </Col>
          </Row>
          <Divider />
          <Row gutter={[8, 24]}>
            <Col span={12} role="pendingWithdrawals">
              <Statistic
                title={t("HEADER_CARD_FINANCIAL_SUMMARY_PENDING_WITHDRAWALS")}
                value={`${financialSummary?.pendingWithdrawals.amount}`}
                valueStyle={{ color: "#cf1322" }}
                prefix="$"
              />
            </Col>
            <Col span={12} role="summaryProfit">
              <Statistic
                title={t("HEADER_CARD_FINANCIAL_SUMMARY_PROFIT")}
                value={`${profit}`}
                valueStyle={
                  profit < 0 ? { color: "#cf1322" } : { color: "#3f8600" }
                }
                prefix="$"
              />
            </Col>
          </Row>
          <Divider />
          <Row gutter={[8, 24]}>
            <Col span={12} role="sportsbookOpenExposure">
              <Statistic
                title={t("HEADER_CARD_FINANCIAL_SUMMARY_SPORTSBOOK_EXPOSURE")}
                value={`${
                  financialSummary?.productBreakdown.sportsbook.openExposure.amount
                }`}
                prefix="$"
              />
            </Col>
            <Col span={12} role="predictionOpenExposure">
              <Statistic
                title={t("HEADER_CARD_FINANCIAL_SUMMARY_PREDICTION_EXPOSURE")}
                value={`${
                  financialSummary?.productBreakdown.prediction.openExposure.amount
                }`}
                prefix="$"
              />
            </Col>
          </Row>
          <Divider />
          <Row gutter={[8, 24]}>
            <Col span={8} role="predictionOpenOrders">
              <Statistic
                title={t(
                  "HEADER_CARD_FINANCIAL_SUMMARY_PREDICTION_OPEN_ORDERS",
                )}
                value={financialSummary?.productBreakdown.prediction.openOrders}
              />
            </Col>
            <Col span={8} role="predictionSettledOrders">
              <Statistic
                title={t(
                  "HEADER_CARD_FINANCIAL_SUMMARY_PREDICTION_SETTLED_ORDERS",
                )}
                value={
                  financialSummary?.productBreakdown.prediction.settledOrders
                }
              />
            </Col>
            <Col span={8} role="predictionCancelledOrders">
              <Statistic
                title={t(
                  "HEADER_CARD_FINANCIAL_SUMMARY_PREDICTION_CANCELLED_ORDERS",
                )}
                value={
                  financialSummary?.productBreakdown.prediction.cancelledOrders
                }
              />
            </Col>
          </Row>
        </Card>
      </TabPane>
    </TabsUserDetails>
  );
};
