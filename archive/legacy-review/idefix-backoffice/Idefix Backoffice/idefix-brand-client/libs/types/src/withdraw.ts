import { Balance } from "./player";
import { PaymentMethod } from "./payments";

export interface WithdrawalFeeConfiguration {
  withdrawalfee: number;
  withdrawalfeemin: number;
  withdrawalfeemax: number;
}

export interface Withdraw {
  withdrawOptions: {
    options: PaymentMethod[];
  };
  accessStatus: { KycChecked: boolean };
  currentBonus: {
    BonusWagerRequirementRemain: string;
    BonusWagerRequirement: string;
    CurrentBonusBalance: string;
    BonusWagerRequirementAchievedPercentage: number;
    CurrentRealBalance: string;
    CurrencySymbol: string;
    WageringComplete: boolean;
    forfeitable: boolean;
  };
  update: {
    balance: Balance;
  };
  withdrawalFee: boolean;
  withdrawalAllowed: boolean;
  withdrawalFeeConfiguration?: WithdrawalFeeConfiguration;
  currencyVars: {
    bonusvaluemultiplier: number;
    depletion: number;
    minimumdeposit: number;
    deposit50: number;
    bonusamount100: number;
    reloadtuesdaybonus: number;
    bonusamount200: number;
    withdrawalfee: number;
    freewithdrawalspermonth: number;
    withdrawalfeemin: number;
    withdrawalfeemax: number;
    withdrawalmin: number;
    irondino25: number;
    reloadweekend: number;
    reelrush: number;
    deposit300: number;
    deposit150: number;
    maxbonusbet: number;
    minimumdepositforfreespins: number;
    depositfreespinslowerlimit: number;
    fee: number;
    deposit40: number;
    towageringcentsdivider: number;
    deposit99: number;
  };
  verificationStatus: {
    verifiable: boolean;
    pending: boolean;
    methods: {
      id: number;
      clearing_house: string;
      currency: string;
      bank_name: string;
      logo: string;
    }[];
    docsNeeded: boolean;
  };
}

export interface PendingWithdraw {
  Amount: string;
  CancelWithdrawal: boolean;
  PaymentMethodName: string;
  UniqueTransactionID: string;
  Timestamp: string;
  WithdrawalFee: string;
}
