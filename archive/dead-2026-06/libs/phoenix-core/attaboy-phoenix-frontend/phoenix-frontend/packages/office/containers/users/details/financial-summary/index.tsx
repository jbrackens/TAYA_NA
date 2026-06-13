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

export const FinancialSummary = ({ id }: FinancialSummaryProps) => {
  const { t } = useTranslation("page-users-details");
  const { TabPane } = Tabs;
  const [financialSummary, setFinancialSummary] = useState<
    FinancialSummaryType
  >();

  const [triggerApi, isLoading, response] = useApi(
    "admin/punters/:id/financial-summary",
    Method.GET,
  );

  useEffect(() => {
    if (response.succeeded) {
      setFinancialSummary(response.data);
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
          <Divider />
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
        </Card>
      </TabPane>
    </TabsUserDetails>
  );
};
