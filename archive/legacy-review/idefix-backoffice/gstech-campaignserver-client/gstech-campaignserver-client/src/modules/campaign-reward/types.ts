import { Reward } from "app/types";

export interface IRewardRuleFormValues {
  trigger: "deposit" | "login" | "registration" | "instant";
  wager: string;
  quantity: string;
  titles: {
    [key: string]: {
      text: string;
      required?: boolean;
    };
  };
  reward?: Reward;
  minDeposit: number | "";
  maxDeposit: number | null | "";
  useOnCredit: boolean;
}
