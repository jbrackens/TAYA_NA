import { RiskProfile, RiskRole, RiskType } from "./risk";
import { PaymentEvent } from "./payment";
import { PlayerSentContent } from "./player";

export interface CountrySettings {
  brandId: string;
  id: string;
  name: string;
  minimumAge: boolean;
  registrationAllowed: boolean;
  loginAllowed: boolean;
  blocked: boolean;
  riskProfile: RiskProfile;
  monthlyIncomeThreshold: number | null;
}

export interface Currency {
  id: number;
  symbol: string;
  defaultConversion: number;
}

export type EventType = "note" | "account" | "activity" | "fraud" | "transaction";

export type ReportType =
  | "users"
  | "deposits"
  | "deposits-summary"
  | "dormant"
  | "game-turnover"
  | "license"
  | "pending-withdrawals"
  | "liabilities"
  | "results"
  | "withdrawals"
  | "withdrawals-summary"
  | "risk-status"
  | "risk-transaction";

export interface CountrySettingsDraft extends Omit<CountrySettings, "brandId" | "id" | "name"> {
  [key: string]: unknown;
}

export interface BrandSettings {
  countries: CountrySettings[];
  languages: {
    id: string;
    name: string;
  }[];
  currencies: Currency[];
}

export interface Settings {
  isProduction: boolean;
  roles: string[];
  tasks: {
    id: string;
    title: string;
  }[];
  brands: BrandInit[];
  paymentProviders: {
    name: string;
  }[];
  brandsSettings: {
    [brandId: string]: BrandSettings;
  };
}

export interface GameSettings {
  id: number;
  gameId: string;
  name: string;
  manufacturerId: string;
  manufacturerGameId: string;
  mobileGame: boolean;
  playForFun: boolean;
  rtp: number | null;
  permalink: string;
  archived: boolean;
}

export interface GameDraft extends Omit<GameSettings, "id"> {
  [key: string]: unknown;
}

export type Operator = "<" | ">" | "=" | "=<" | "=>" | "between";

export interface BrandInit {
  id: string;
  name: string;
  site: string;
  url: string;
  cdnUrl: string;
}

export interface BadgeValue {
  brandId: string;
  tasks: { type: RiskType; requiredRole: RiskRole; count: number }[];
  docs: number;
  withdrawals: number;
  online: number;
  frauds: number;
}

export interface Affiliate {
  id: number;
  name: string;
}

export interface Promotion {
  id: number;
  brandId?: string;
  name: string;
  multiplier: string | number;
  autoStart: boolean;
  active: boolean;
  archived?: boolean;
  allGames: boolean;
  calculateRounds: boolean;
  calculateWins: boolean;
  calculateWinsRatio: boolean;
  minimumContribution: string | number;
}

export interface TransactionDate {
  [key: string]: string;
}

export interface WithdrawalEvent extends PaymentEvent {
  userId: number;
}

export type TransactionType = "withdraw" | "compensation" | "correction";

export interface Transaction {
  type: TransactionType;
  accountId?: number;
  amount: number;
  reason: string;
  noFee?: boolean;
}

export interface GamblingProblemData {
  player: {
    email: string;
    firstName: string;
    lastName: string;
    address?: string;
    postCode?: string;
    city?: string;
    countryId?: string;
    dateOfBirth?: string;
    mobilePhone?: string;
    nationalId?: string;
  };
  note?: string;
}

export interface WithdrawalWithOptions {
  id: string;
  amount: number;
  formattedAmount: string;
  accountId: number;
  account: string;
  timestamp: string;
  paymentParameters: {
    staticId?: number | null;
  };
  canAcceptWithDelay: boolean;
  delayedAcceptTime: string;
  paymentMethod: {
    id: number;
    name: string;
  };
  paymentProviders: {
    account: string;
    id: number;
    name: string;
    provider: string;
    parameters: Record<string, unknown>;
    priority: number;
  }[];
}

export type SuspendReason =
  | "multiple"
  | "fake"
  | "fraudulent"
  | "suspicious"
  | "ipcountry"
  | "gambling_problem"
  | "data_removal";

export interface ClosedAccount {
  id: number;
  firstName: string;
  lastName: string;
  brandId: string;
  email: string;
  username: string;
}

export interface Questionnaire {
  name: string;
  description: string;
  answeredAt: string | null;
  answers: {
    key: string;
    question: string;
    answer: string;
  }[];
}

export interface CampaignsTab {
  content: PlayerSentContent[];
  pagination: {
    pageSize: number;
    pageIndex: number;
    total: number;
    lastPage: number;
    from: number;
    to: number;
  };
}

export interface NewCampaign {
  brandId: string;
  operations: {
    type: string;
    operator: Operator;
    currency: string;
    dates: { startDate: string; endDate: string };
    between: object;
  }[];
}
