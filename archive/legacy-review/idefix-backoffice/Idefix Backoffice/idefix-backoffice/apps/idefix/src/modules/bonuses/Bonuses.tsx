import { FC, useMemo } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";

import { CircularProgressbar, LoadingIndicator } from "@idefix-backoffice/idefix/components";

import { useBonuses } from "./hooks";
import { BonusesTable } from "./components/BonusesTable";

interface CardProps {
  title: string;
  subtitle?: string | number;
  info: { label: string; value: string | number }[];
}

const Card: FC<CardProps> = ({ title, subtitle, info }) => {
  return (
    <Paper square sx={{ height: "100%", padding: 2 }}>
      <Typography>{title}</Typography>
      <Typography>{subtitle}</Typography>
      <Box mt={3}>
        {info.map(({ label, value }, index) => (
          <Typography key={`${label}${index}`} sx={{ display: "flex" }}>
            {label}
            <Typography component="span" ml="auto">
              {value}
            </Typography>
          </Typography>
        ))}
      </Box>
    </Paper>
  );
};

interface ProgressCardProps {
  value: number | undefined;
}

const ProgressCard: FC<ProgressCardProps> = ({ value }) => {
  return (
    <Paper
      square
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        padding: 2
      }}
    >
      <Box sx={{ height: "76px", width: "96px" }}>
        <CircularProgressbar value={value ? value * 100 : 0} circleRatio={0.6} />
      </Box>
      <Typography variant="body2">Ratio of bonuses + comps + freespins to deposits</Typography>
    </Paper>
  );
};

const Bonuses: FC = () => {
  const { bonuses, isLoadingBonuses, financialInfo, isLoadingFinancialInfo, handleForfeit } = useBonuses();

  const cards = useMemo(
    () =>
      financialInfo
        ? [
            {
              title: "Total balance",
              subtitle: financialInfo.totalBalance,
              items: [
                {
                  label: "Real money",
                  value: financialInfo.balance
                },
                {
                  label: "Bonus money",
                  value: financialInfo.bonusBalance
                }
              ]
            },
            {
              title: "Total deposits",
              subtitle: financialInfo.totalDepositAmount,
              items: [
                {
                  label: "in last 6 months",
                  value: financialInfo.depositAmountInSixMonths
                },

                {
                  label: "Deposit count",
                  value: financialInfo.depositCount
                },
                {
                  label: "Deposit count in 6 months",
                  value: financialInfo.depositCountInSixMonths
                }
              ]
            },
            {
              title: "Total withdrawals",
              subtitle: financialInfo.totalWithdrawalAmount,
              items: [
                {
                  label: "in last 6 months",
                  value: financialInfo.withdrawalAmountInSixMonths
                },
                {
                  label: "Withdrawal count",
                  value: financialInfo.withdrawalCount
                },
                {
                  label: "Withdrawal count in 6 months",
                  value: financialInfo.withdrawalCountInSixMonths
                }
              ]
            },
            {
              title: "RTP",
              subtitle: financialInfo.rtp,
              items: [
                {
                  label: "Total bet amount",
                  value: financialInfo.totalBetAmount
                },
                {
                  label: "Total win amount",
                  value: financialInfo.totalWinAmount
                },
                {
                  label: "Deposits - WDs",
                  value: financialInfo.depositsMinusWithdrawals
                },
                {
                  label: "Deposits - WDs in 6 months",
                  value: financialInfo.depositsMinusWithdrawalsInSixMonths
                }
              ]
            },
            {
              title: "Bonus money",
              items: [
                {
                  label: "Credited bonus money",
                  value: financialInfo.creditedBonusMoney
                },
                {
                  label: "Money from freespins",
                  value: financialInfo.freespins
                },
                {
                  label: "Credited compensations",
                  value: financialInfo.compensations
                },
                {
                  label: "Bonus money turned to real",
                  value: financialInfo.bonusToReal
                }
              ]
            }
          ]
        : [],
    [financialInfo]
  );

  return (
    <Box>
      {isLoadingFinancialInfo ? (
        <Box display="flex" justifyContent="center" alignItems="center">
          <LoadingIndicator />
        </Box>
      ) : (
        <Grid container spacing={{ xs: 2 }}>
          <>
            {cards.map((item, idx) => (
              <Grid item xs={4} key={item.title + idx}>
                <Card title={item.title} subtitle={item.subtitle} info={item.items} />
              </Grid>
            ))}
            <Grid item xs={4}>
              <ProgressCard value={financialInfo?.bonusToDepositRatio} />
            </Grid>
          </>
        </Grid>
      )}
      <Box display="flex" flexDirection="column" flexGrow={1} mt={3} paddingBottom={12} width="100%">
        <BonusesTable bonuses={bonuses} isLoading={isLoadingBonuses} onForfeit={handleForfeit} />
      </Box>
    </Box>
  );
};

export { Bonuses };
