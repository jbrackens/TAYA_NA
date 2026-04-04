function getBonusPercentage(value: number) {
  return `${Math.abs((value / 1) * 100 - 100)}%`;
}

function getWithdrawalFee(
  value: string,
  percentage: number,
  min: number,
  max: number
) {
  const fee = (Number(value.replace(/,/g, ".")) * percentage) / 100;

  if (fee <= min / 100) {
    return Number(min / 100);
  }

  if (fee >= max / 100) {
    return Number(max / 100);
  }

  return Number(fee);
}

export { getBonusPercentage, getWithdrawalFee };
