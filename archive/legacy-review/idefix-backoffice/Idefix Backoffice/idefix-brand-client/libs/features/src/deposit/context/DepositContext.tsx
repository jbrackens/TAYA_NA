import { createContext, Dispatch, SetStateAction } from "react";
import {
  BonusOption,
  CampaignOption,
  Deposit,
  FreeSpin,
  DepositLimit,
  DepositMethod
} from "@brandserver-client/types";
import { DepositOptionValues } from "../types";
import * as React from "react";

type DepositContextType = {
  splashScreenIsOpen: boolean;
  deposit: Deposit;
  campaign: CampaignOption | undefined;
  bonus: BonusOption | undefined;
  freeSpins: FreeSpin[];
  campaignOptionValues: DepositOptionValues;
  bonusOptionValues: DepositOptionValues;
  selectedDepositMethod: DepositMethod;
  setBonusOptionValues: React.Dispatch<
    React.SetStateAction<DepositOptionValues>
  >;
  onSetData: Dispatch<SetStateAction<Deposit | undefined>>;
  onCancelLimit: (limit: DepositLimit) => Promise<void>;
  onToggleCampaignOptionValue: (optionId: string) => void;
  onToggleBonusOptionValue: (optionId: string) => void;
  onToggleSplashScreen: () => void;
  onSelectDepositMethod: (uid: string) => void;
};

const DepositContext = createContext<DepositContextType | undefined>(undefined);

export { DepositContext };
