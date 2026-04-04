import { useDeposit } from "../context";

function useMinDepositAmount(): number | undefined {
  const {
    bonusOptionValues,
    campaignOptionValues,
    deposit: { depositOptions }
  } = useDeposit();
  const options = [
    ...(depositOptions.bonus?.options || []),
    ...(depositOptions.campaign?.options || [])
  ];

  const bonusesWithMinAmount = options.filter(
    option =>
      (bonusOptionValues[option.id] || campaignOptionValues[option.id]) &&
      option.minAmount
  );

  const minAmounts = bonusesWithMinAmount.map(
    option => option.minAmount
  ) as number[];

  return minAmounts.length > 0 ? Math.max(...minAmounts) : undefined;
}

export { useMinDepositAmount };
