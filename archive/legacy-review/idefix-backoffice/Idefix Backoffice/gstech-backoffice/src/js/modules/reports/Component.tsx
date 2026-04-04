import React from "react";
import Box from "@material-ui/core/Box";
import LiabilitiesTable from "./components/LiabilitiesTable";
import PaymentsTable from "./components/PaymentsTable";
import WithdrawalsTable from "./components/WithdrawalsTable";
import PendingWithdrawalsTable from "./components/PendingWithdrawalsTable";
import PlayersTable from "./components/PlayersTable";
import PaymentsSummaryTable from "./components/PaymentsSummaryTable";
import LicenseTable from "./components/LicenseTable";
import ResultsTable from "./components/ResultsTable";
import WeekForm from "./components/WeekForm";
import MonthForm from "./components/MonthForm";
import CountryForm from "./components/CountryForm";
import LicenseForm from "./components/LicenseForm";
import YearForm from "./components/YearForm";
import TypeForm from "./components/TypeForm";
import RiskProfileForm from "./components/RiskProfileForm";
import GameTurnoverTable from "./components/GameTurnoverTable";
import UsersTable from "./components/UsersTable";
import PlayerRiskStatusTable from "./components/PlayerRiskStatusTable";
import PlayerRiskTransactionTable from "./components/PlayerRiskTransactionTable";
import PaymentProvidersForm from "./components/PaymentProvidersForm";
import GameProfileForm from "./components/GameProfileForm";
import BrandSelector from "../../core/components/brand-selector";
import SelectReportType from "./components/ReportType";
import { ReportType } from "app/types";
import Divider from "@material-ui/core/Divider";
import { Typography } from "@material-ui/core";

interface Props {
  reportType: ReportType;
  values: any;
  report: any;
  paymentProviders?: {
    name: string;
  }[];
  onSelectType: (value: ReportType) => void;
  onChangeValue: (key: any, value: any) => void;
  onSelectBrand: (brand: string) => void;
  onFetchMoreData: (pageSize?: number, text?: string) => void;
  isLoading: boolean;
}

export default ({
  reportType,
  values,
  report,
  paymentProviders,
  onSelectType,
  onChangeValue,
  onSelectBrand,
  onFetchMoreData,
  isLoading,
}: Props) => {
  const showBrandSelector = [
    "risk-status",
    "risk-transaction",
    "pending-withdrawals",
    "dormant",
    "liabilities",
    "results",
    "game-turnover",
    "deposits",
    "withdrawals",
    "deposits-summary",
    "withdrawals-summary",
  ].includes(reportType);

  const showMonthForm = [
    "license",
    "liabilities",
    "game-turnover",
    "deposits-summary",
    "withdrawals-summary",
    "withdrawals",
    "risk-transaction",
  ].includes(reportType);

  return (
    <Box display="flex" flexDirection="column" p={3} position="relative" height="calc(100vh - 49px)">
      <Typography variant="subtitle2">Reports</Typography>

      <Box display="flex" mt={3} width="100%">
        <Box display="flex" width="100%">
          <Box mr={2}>
            <SelectReportType onSelectType={onSelectType} reportType={reportType} />
          </Box>

          {reportType === "risk-transaction" && (
            <Box mr={2}>
              <RiskProfileForm values={values} onChangeValue={onChangeValue} />
            </Box>
          )}

          {reportType === "results" && (
            <Box mr={2}>
              <TypeForm values={values} onChangeValue={onChangeValue} />
            </Box>
          )}
          {reportType === "results" && (values.span === "week" || values.span === "day") && (
            <Box mr={2}>
              <MonthForm values={values} onChangeValue={onChangeValue} keyField="time" />
            </Box>
          )}

          {reportType === "results" && values.span === "month" && (
            <Box mr={2}>
              <YearForm values={values} onChangeValue={onChangeValue} keyField="time" />
            </Box>
          )}

          {showMonthForm && (
            <Box display="flex" mr={2}>
              <MonthForm values={values} onChangeValue={onChangeValue} />
            </Box>
          )}

          {reportType === "license" && (
            <Box display="flex" mr={2}>
              <LicenseForm values={values} onChangeValue={onChangeValue} />
              <Box ml={2}>
                <CountryForm values={values} onChangeValue={onChangeValue} />
              </Box>
              <Box ml={2}>
                <GameProfileForm values={values} onChangeValue={onChangeValue} />
              </Box>
            </Box>
          )}

          {reportType === "deposits" && (
            <Box mr={2}>
              <WeekForm values={values} onChangeValue={onChangeValue} />
            </Box>
          )}

          {(reportType === "withdrawals" || reportType === "deposits") && (
            <Box mr={2}>
              <PaymentProvidersForm values={values} onChangeValue={onChangeValue} paymentProviders={paymentProviders} />
            </Box>
          )}

          {showBrandSelector && (
            <Box display="flex" alignItems="center">
              <BrandSelector selectedBrand={values.brandId} onChange={onSelectBrand} />
            </Box>
          )}
        </Box>
      </Box>

      <Box mt={3}>
        <Divider light />
      </Box>

      <Box display="flex" flexDirection="column" mt={2}>
        {reportType === "liabilities" && <LiabilitiesTable items={report} isLoading={isLoading} />}
        {reportType === "users" && <UsersTable items={report} isLoading={isLoading} />}
        {reportType === "dormant" && <PlayersTable items={report} isLoading={isLoading} />}
        {reportType === "results" && <ResultsTable items={report} isLoading={isLoading} />}
        {reportType === "game-turnover" && <GameTurnoverTable items={report} isLoading={isLoading} />}
        {reportType === "deposits" && (
          <PaymentsTable items={report} isLoading={isLoading} onFetchMoreData={onFetchMoreData} values={values} />
        )}
        {reportType === "withdrawals" && (
          <WithdrawalsTable items={report} isLoading={isLoading} onFetchMoreData={onFetchMoreData} values={values} />
        )}
        {reportType === "pending-withdrawals" && <PendingWithdrawalsTable items={report} isLoading={isLoading} />}
        {reportType === "deposits-summary" && <PaymentsSummaryTable items={report} isLoading={isLoading} />}
        {reportType === "withdrawals-summary" && <PaymentsSummaryTable items={report} isLoading={isLoading} />}
        {reportType === "risk-status" && <PlayerRiskStatusTable items={report} isLoading={isLoading} />}
        {reportType === "risk-transaction" && <PlayerRiskTransactionTable items={report} isLoading={isLoading} />}
        {reportType === "license" && (
          <LicenseTable items={report} isLoading={isLoading} isSportsBook={values["gameProfile"] === "Sportsbetting"} />
        )}
      </Box>
    </Box>
  );
};
