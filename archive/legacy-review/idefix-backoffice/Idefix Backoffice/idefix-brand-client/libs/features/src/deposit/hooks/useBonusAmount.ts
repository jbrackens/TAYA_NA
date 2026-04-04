import * as React from "react";
import { formatMoney } from "@brandserver-client/utils";
import { calculateBonus, getMinDepositLimit } from "../utils";
import { useDeposit } from "../context";
import { useMinDepositAmount } from "./useMinDepositAmount";

function useBonusAmount(amount: number) {
  const [bonusAmount, setBonusAmount] = React.useState(0);

  const minDepositAmount = useMinDepositAmount();

  const { bonus, selectedDepositMethod } = useDeposit();

  const minDepositLimit = getMinDepositLimit(
    minDepositAmount,
    selectedDepositMethod.lowerLimit
  );

  React.useEffect(() => {
    if (!bonus) {
      return;
    }

    if (
      amount >= minDepositLimit &&
      amount <= selectedDepositMethod.upperLimit
    ) {
      const newBonus = calculateBonus(amount, bonus);
      setBonusAmount(newBonus);
    } else {
      setBonusAmount(0);
    }
  }, [amount, bonus]);

  if (bonusAmount) {
    return `+${formatMoney(
      bonusAmount,
      selectedDepositMethod.currencySymbol
    )} Bonus`;
  }

  return undefined;
}

export { useBonusAmount };
