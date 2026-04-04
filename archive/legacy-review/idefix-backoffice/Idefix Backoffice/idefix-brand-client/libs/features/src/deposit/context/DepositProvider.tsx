import * as React from "react";
import { ReactNode, useContext, useMemo } from "react";
import { Deposit, DepositLimit } from "@brandserver-client/types";
import { ApiContext } from "@brandserver-client/api";
import { DepositContext } from "./DepositContext";
import { useBonus } from "../hooks/useBonus";
import { useCampaign } from "../hooks/useCampaign";
import { useFreeSpins } from "../hooks/useFreeSpins";
import { useSplashScreen } from "../hooks/useSplashScreen";
import { useDepositMethod } from "../hooks/useDepositMethod";

interface Props {
  children: ReactNode;
  deposit: Deposit;
  onSetData: React.Dispatch<React.SetStateAction<Deposit | undefined>>;
}

function DepositProvider({ children, deposit, onSetData }: Props) {
  const api = useContext(ApiContext);

  const { depositOptions, depositMethods } = deposit;

  const { splashScreenIsOpen, onToggleSplashScreen } = useSplashScreen();

  const {
    bonus,
    bonusOptionValues,
    onToggleBonusOptionValue,
    setBonusOptionValues
  } = useBonus(depositOptions);

  const { campaign, campaignOptionValues, onToggleCampaignOptionValue } =
    useCampaign(depositOptions);

  const freeSpins = useFreeSpins({
    initialFreeSpins: depositOptions.freespins,
    bonus,
    campaign
  });

  const { selectedDepositMethod, onSelectDepositMethod } =
    useDepositMethod(depositMethods);

  const onCancelLimit = React.useCallback(
    async (limit: DepositLimit) => {
      try {
        const {
          canBeCancelled,
          expires,
          isInternal,
          isPermanent: permanent,
          limitLeft
        } = await api.exclusion.removeExclusion(limit.key);

        const newLimit = {
          ...limit,
          canBeCancelled,
          expires,
          isInternal: isInternal!,
          permanent,
          limitLeft: limitLeft!
        };

        onSetData(prevData => {
          if (!prevData) {
            return prevData;
          }

          return { ...prevData, limit: newLimit };
        });
      } catch (error) {
        console.log(error, "error");
      }
    },
    [onSetData]
  );

  const value = useMemo(
    () => ({
      splashScreenIsOpen,
      bonus,
      campaign,
      freeSpins,
      deposit,
      campaignOptionValues,
      bonusOptionValues,
      selectedDepositMethod,
      setBonusOptionValues,
      onSetData,
      onCancelLimit,
      onToggleSplashScreen,
      onToggleCampaignOptionValue,
      onToggleBonusOptionValue,
      onSelectDepositMethod
    }),
    [
      splashScreenIsOpen,
      deposit,
      campaign,
      bonus,
      freeSpins,
      campaignOptionValues,
      bonusOptionValues,
      selectedDepositMethod,
      setBonusOptionValues,
      onSetData,
      onToggleSplashScreen,
      onCancelLimit,
      onToggleCampaignOptionValue,
      onToggleBonusOptionValue,
      onSelectDepositMethod
    ]
  );

  return (
    <DepositContext.Provider value={value}>{children}</DepositContext.Provider>
  );
}

export { DepositProvider };
