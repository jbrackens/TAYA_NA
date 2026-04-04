import * as React from "react";
import { DepositOptions } from "@brandserver-client/types";
import { setInitialDepositOptionValues } from "../utils";
import find from "lodash/find";

function useBonus(depositOptions: DepositOptions) {
  const [bonusOptionValues, setBonusOptionValues] = React.useState(
    setInitialDepositOptionValues(depositOptions.bonus?.options)
  );

  const bonus = React.useMemo(
    () =>
      depositOptions.bonus?.options?.find(
        option => bonusOptionValues[option.id]
      ),
    [bonusOptionValues, depositOptions]
  );

  const onToggleBonusOptionValue = React.useCallback(
    (optionId: string) => {
      if (depositOptions.bonus!.options.length > 1) {
        const nonActiveBonusOption = find(
          depositOptions.bonus!.options,
          option => option.id !== optionId
        );

        return setBonusOptionValues(prevValues => ({
          [optionId]: !prevValues[optionId],
          [nonActiveBonusOption!.id]: false
        }));
      }

      setBonusOptionValues(prevValues => ({
        ...prevValues,
        [optionId]: !prevValues[optionId]
      }));
    },
    [depositOptions]
  );

  return {
    bonus,
    bonusOptionValues,
    onToggleBonusOptionValue,
    setBonusOptionValues
  };
}

export { useBonus };
