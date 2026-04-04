import React from "react";
import Box from "@material-ui/core/Box";
import BonusesTable from "./components/BonusesTable";
import { Card } from "../../core/components/new-card";
import { PlayerBonus, PlayerFinancialInfo } from "app/types";
import Divider from "@material-ui/core/Divider";
import ProgressBar from "../../core/components/new-card/components/ProgressBar";
import Typography from "@material-ui/core/Typography";

export default ({
  bonuses,
  isFetching,
  onForfeit,
  financialInfo,
}: {
  bonuses: PlayerBonus[];
  isFetching: boolean;
  onForfeit: (bonus: PlayerBonus) => void;
  financialInfo: PlayerFinancialInfo;
}) => {
  const {
    balance,
    bonusBalance,
    totalBalance,
    totalBetAmount,
    totalWinAmount,
    rtp,
    depositCount,
    withdrawalCount,
    totalDepositAmount,
    totalWithdrawalAmount,
    depositCountInSixMonths,
    depositAmountInSixMonths,
    withdrawalCountInSixMonths,
    withdrawalAmountInSixMonths,
    creditedBonusMoney,
    bonusToReal,
    freespins,
    compensations,
    bonusToDepositRatio,
    depositsMinusWithdrawals,
    depositsMinusWithdrawalsInSixMonths,
  } = financialInfo;

  const totalBalanceInfo = [
    {
      label: "Real money",
      value: balance,
    },
    {
      label: "Bonus money",
      value: bonusBalance,
    },
  ];
  const totalDepositsInfo = [
    {
      label: "in last 6 months",
      value: depositAmountInSixMonths,
    },

    {
      label: "Deposit count",
      value: depositCount,
    },
    {
      label: "Deposit count in 6 months",
      value: depositCountInSixMonths,
    },
  ];
  const totalWithdrawalInfo = [
    {
      label: "in last 6 months",
      value: withdrawalAmountInSixMonths,
    },
    {
      label: "Withdrawal count",
      value: withdrawalCount,
    },
    {
      label: "Withdrawal count in 6 months",
      value: withdrawalCountInSixMonths,
    },
  ];
  const rtpInfo = [
    {
      label: "Total bet amount",
      value: totalBetAmount,
    },
    {
      label: "Total win amount",
      value: totalWinAmount,
    },
    {
      label: "Deposits - WDs",
      value: depositsMinusWithdrawals,
    },
    {
      label: "Deposits - WDs in 6 months",
      value: depositsMinusWithdrawalsInSixMonths,
    },
  ];
  const bonusMoneyInfo = [
    {
      label: "Credited bonus money",
      value: creditedBonusMoney,
    },
    {
      label: "Money from freespins",
      value: freespins,
    },
    {
      label: "Credited compensations",
      value: compensations,
    },
    {
      label: "Bonus money turned to real",
      value: bonusToReal,
    },
  ];

  return (
    <Box display="flex" flexDirection="column" flexGrow={1} width={1} p={3}>
      <Box display="flex">
        <Box width="calc(100% / 3)">
          <Card title="Total balance" subtitle={totalBalance} textInfo={totalBalanceInfo} />
        </Box>

        <Box ml={2} mr={2}>
          <Divider orientation="vertical" light />
        </Box>

        <Box width="calc(100% / 3)">
          <Card title="Total deposits" subtitle={totalDepositAmount} textInfo={totalDepositsInfo} />
        </Box>

        <Box ml={2} mr={2}>
          <Divider orientation="vertical" light />
        </Box>

        <Box width="calc(100% / 3)">
          <Card title="Total withdrawals" subtitle={totalWithdrawalAmount} textInfo={totalWithdrawalInfo} />
        </Box>
      </Box>

      <Box mt={2}>
        <Divider light />
      </Box>

      <Box display="flex" mt={2}>
        <Box width="calc(100% / 3)">
          <Card title="RTP" subtitle={rtp} textInfo={rtpInfo} />
        </Box>

        <Box ml={2} mr={2}>
          <Divider orientation="vertical" light />
        </Box>

        <Box width="calc(100% / 3)">
          <Card title="Bonus money" textInfo={bonusMoneyInfo} customStyle={{ marginTop: 52 }} />
        </Box>

        <Box ml={2} mr={2}>
          <Divider orientation="vertical" light />
        </Box>

        <Box display="flex" justifyContent="center" width="calc(100% / 3)">
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center">
            <Box width="96px" height="76px">
              <ProgressBar value={bonusToDepositRatio! * 100} />
            </Box>
            <Box maxWidth="200px" textAlign="center">
              <Typography variant="body2">Ratio of bonuses + comps + freespins to deposits</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box mt={3}>
        <Divider light />
      </Box>

      <Box display="flex" flexDirection="column" flexGrow={1} mt={3} paddingBottom={12} width="100%">
        <BonusesTable bonuses={bonuses} isLoading={isFetching} onForfeit={onForfeit} />
      </Box>
    </Box>
  );
};
