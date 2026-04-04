import { PlayerWithdrawals } from "@idefix-backoffice/idefix/types";

const getWithdrawalFee = (
  value: number,
  withdrawalFeeConfiguration: PlayerWithdrawals["withdrawalFeeConfiguration"]
) => {
  const { withdrawalFee: percentage, withdrawalFeeMin, withdrawalFeeMax } = withdrawalFeeConfiguration;
  const fee = (value * percentage) / 100;

  if (percentage > 0 && fee <= withdrawalFeeMin) {
    return Number(withdrawalFeeMin / 100);
  }
  if (fee >= withdrawalFeeMax) {
    return Number(withdrawalFeeMax / 100);
  }

  return Number(fee / 100);
};

export { getWithdrawalFee };
