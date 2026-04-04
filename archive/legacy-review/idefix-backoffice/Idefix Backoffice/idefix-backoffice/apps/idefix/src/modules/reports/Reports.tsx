import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { FC } from "react";

import { BrandSelector } from "@idefix-backoffice/idefix/components";
import { useReports } from "./hooks";
import { CountryForm } from "./components/CountryForm";
import { GameProfileForm } from "./components/GameProfileForm";
import { LicenseForm } from "./components/LicenseForm";
import { MonthForm } from "./components/MonthForm";
import { PaymentProvidersForm } from "./components/PaymentProvidersForm";
import { RiskProfileForm } from "./components/RiskProfileForm";
import { SelectReportType } from "./components/SelectReportType";
import { TypeForm } from "./components/TypeForm";
import { WeekForm } from "./components/WeekForm";
import { YearForm } from "./components/YearForm";
import { LiabilitiesTable } from "./components/LiabilitiesTable";
import { GameTurnoverTable } from "./components/GameTurnoverTable";
import { LicenseTable } from "./components/LicenseTable";
import { PaymentsSummaryTable } from "./components/PaymentsSummaryTable";
import { PaymentsTable } from "./components/PaymentsTable";
import { PendingWithdrawalsTable } from "./components/PendingWithdrawalsTable";
import { PlayerRiskTransactionTable } from "./components/PlayerRiskTransactionTable";
import { PlayersTable } from "./components/PlayersTable";
import { ResultsTable } from "./components/ResultsTable";
import { UsersTable } from "./components/UsersTable";
import { WithdrawalsTable } from "./components/WithdrawalsTable";
import { PlayerRiskStatusTable } from "./components/PlayerRiskStatusTable";

const Reports: FC = () => {
  const {
    brands,
    reportType,
    reports,
    values,
    isLoading,
    paymentProviders,
    handleSelectType,
    handleChangeValue,
    handleSelectBrand,
    handleFetchMoreData
  } = useReports();

  const showBrandSelector =
    reportType &&
    [
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
      "withdrawals-summary"
    ].includes(reportType);

  const showMonthForm =
    reportType &&
    [
      "license",
      "liabilities",
      "game-turnover",
      "deposits-summary",
      "withdrawals-summary",
      "withdrawals",
      "risk-transaction"
    ].includes(reportType);

  return (
    <Box p={3}>
      <Typography variant="subtitle2">Reports</Typography>

      <Box display="flex" mt={3} width="100%">
        <Box display="flex" width="100%">
          <Box mr={2}>
            <SelectReportType onSelectType={handleSelectType} reportType={reportType ?? "users"} />
          </Box>

          {reportType === "risk-transaction" && (
            <Box mr={2}>
              <RiskProfileForm values={values} onChangeValue={handleChangeValue} />
            </Box>
          )}

          {reportType === "results" && (
            <Box mr={2}>
              <TypeForm values={values} onChangeValue={handleChangeValue} />
            </Box>
          )}
          {reportType === "results" && (values["span"] === "week" || values["span"] === "day") && (
            <Box mr={2}>
              <MonthForm values={values} onChangeValue={handleChangeValue} keyField="time" />
            </Box>
          )}

          {reportType === "results" && values["span"] === "month" && (
            <Box mr={2}>
              <YearForm values={values} onChangeValue={handleChangeValue} keyField="time" />
            </Box>
          )}

          {showMonthForm && (
            <Box display="flex" mr={2}>
              <MonthForm values={values} onChangeValue={handleChangeValue} />
            </Box>
          )}

          {reportType === "license" && (
            <Box display="flex" mr={2}>
              <LicenseForm values={values} onChangeValue={handleChangeValue} />
              <Box ml={2}>
                <CountryForm values={values} onChangeValue={handleChangeValue} />
              </Box>
              <Box ml={2}>
                <GameProfileForm values={values} onChangeValue={handleChangeValue} />
              </Box>
            </Box>
          )}

          {reportType === "deposits" && (
            <Box mr={2}>
              <WeekForm values={values} onChangeValue={handleChangeValue} />
            </Box>
          )}

          {(reportType === "withdrawals" || reportType === "deposits") && (
            <Box mr={2}>
              <PaymentProvidersForm
                values={values}
                onChangeValue={handleChangeValue}
                paymentProviders={paymentProviders}
              />
            </Box>
          )}

          {showBrandSelector && (
            <Box display="flex" alignItems="center">
              <BrandSelector brands={brands} selectedBrand={values.brandId} onChange={handleSelectBrand} />
            </Box>
          )}
        </Box>
      </Box>

      <Box mt={3}>
        <Divider light />
      </Box>

      <Box display="flex" flexDirection="column" mt={2}>
        {reportType === "liabilities" && <LiabilitiesTable items={reports} isLoading={isLoading} />}
        {reportType === "users" && <UsersTable items={reports} isLoading={isLoading} />}
        {reportType === "dormant" && <PlayersTable items={reports} isLoading={isLoading} />}
        {reportType === "results" && <ResultsTable items={reports} isLoading={isLoading} />}
        {reportType === "game-turnover" && <GameTurnoverTable items={reports} isLoading={isLoading} />}
        {reportType === "deposits" && (
          <PaymentsTable items={reports} isLoading={isLoading} onFetchMoreData={handleFetchMoreData} values={values} />
        )}
        {reportType === "withdrawals" && (
          <WithdrawalsTable
            items={reports}
            isLoading={isLoading}
            onFetchMoreData={handleFetchMoreData}
            values={values}
          />
        )}
        {reportType === "pending-withdrawals" && <PendingWithdrawalsTable items={reports} isLoading={isLoading} />}
        {reportType === "deposits-summary" && <PaymentsSummaryTable items={reports} isLoading={isLoading} />}
        {reportType === "withdrawals-summary" && <PaymentsSummaryTable items={reports} isLoading={isLoading} />}
        {reportType === "risk-status" && <PlayerRiskStatusTable items={reports} isLoading={isLoading} />}
        {reportType === "risk-transaction" && <PlayerRiskTransactionTable items={reports} isLoading={isLoading} />}
        {reportType === "license" && <LicenseTable items={reports} isLoading={isLoading} />}
      </Box>
    </Box>
  );
};

export { Reports };
