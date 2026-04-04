import { useRouter } from "next/router";
import { useEffect } from "react";
import { BonusOption } from "@brandserver-client/types";
import { useDeposit } from "../context";
import { hasBonus } from "../utils";
import find from "lodash/find";

function useSelectBonusByQuery() {
  const { query } = useRouter();
  const {
    deposit: { depositOptions },
    onToggleSplashScreen,
    setBonusOptionValues
  } = useDeposit();

  useEffect(() => {
    if (!hasBonus(depositOptions) || query.type !== "bonus") {
      return;
    }

    const bonusById = depositOptions.bonus!.options.find(
      (option: BonusOption) => option.id === query.id
    );

    if (!bonusById) {
      return;
    }

    const nonActiveBonusOption = find(
      depositOptions.bonus!.options,
      option => option.id !== query.id
    ) as BonusOption;

    if (nonActiveBonusOption) {
      setBonusOptionValues({
        [query.id as string]: true,
        [nonActiveBonusOption.id]: false
      });
    } else {
      setBonusOptionValues({
        [query.id as string]: true
      });
    }

    onToggleSplashScreen();
  }, [query, depositOptions, onToggleSplashScreen]);
}

export { useSelectBonusByQuery };
