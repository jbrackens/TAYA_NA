import { LimitType, PeriodType } from "./limit";
import { RiskProfile } from "./risk";
import { Kyc } from "./kyc";
import { EventType } from "./settings";

export interface PlayerDraft {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  postCode: string;
  city: string;
  countryId: string;
  dateOfBirth: string;
  mobilePhone: string;
  languageId: string;
  nationalId: string;
  allowEmailPromotions: boolean;
  allowSMSPromotions: boolean;
  activated: boolean;
  testPlayer: boolean;
  placeOfBirth: string;
  nationality: string;
  additionalFields: Record<string, unknown>;
  reason?: string;
}

export interface Player extends PlayerDraft {
  id: number;
  brandId: string;
  username: string;
  currencyId: string;
  gamblingProblem: boolean;
  accountClosed: boolean;
  accountSuspended: boolean;
  createdAt: string;
  verified: boolean;
  tcVersion: string;
}

export interface PlayerWithUpdate extends Player {
  lastLogin: string;
  kycDocuments: {
    id: number;
    name: string;
  }[];
  withdrawals: {
    id: string;
    amount: number;
    delayedAcceptTime: string;
    timestamp?: string;
  }[];
  fraudIds: number[];
  update: PlayerStatus;
  brandId: string;
  kycDocumentIds?: number[];
  pendingDeposits?: boolean;
  online?: boolean;
  totalAmount?: number;
}

export interface PlayerStatus {
  balance: {
    currencyId: string;
    reservedBalance: number;
    realBalance: number;
    bonusBalance: number;
    totalBalance: number;
    formatted: {
      reservedBalance: string;
      realBalance: string;
      bonusBalance: string;
      totalBalance: string;
    };
  };
}

export interface PlayerFinancialInfo {
  balance: number | string;
  bonusBalance: number | string;
  totalBalance: number | string;
  totalBetAmount: number | string;
  totalWinAmount: number | string;
  rtp: number | string;
  depositCount: number | string;
  withdrawalCount: number | string;
  totalDepositAmount: number | string;
  totalWithdrawalAmount: number | string;
  depositCountInSixMonths: number | string;
  depositAmountInSixMonths: number | string;
  withdrawalCountInSixMonths: number | string;
  withdrawalAmountInSixMonths: number | string;
  creditedBonusMoney: number | string;
  bonusToReal: number | string;
  freespins: number | string;
  compensations: number | string;
  bonusToDepositRatio: number;
  depositsMinusWithdrawals: number | string;
  depositsMinusWithdrawalsInSixMonths: number | string;
}

export interface PlayerRegistrationInfo {
  affiliateId: number;
  affiliateName: string;
  affiliateRegistrationCode: string;
  ipAddress: string;
  registrationIP: string;
  registrationCountry: string;
  registrationTime: string;
  createdAt: string;
  lastLogin: string;
}

export interface PlayerEvent {
  id: number;
  type: EventType;
  key: string;
  content: string;
  details: {
    [key: string]: unknown;
  };
  fraudId: number;
  createdAt: string;
  handle: string;
  userId: number;
  isSticky: boolean;
  title: string;
}

export interface PlayerAccountStatus {
  ddPending: boolean;
  ddMissing: boolean;
  potentialGamblingProblem: boolean;
  verified: boolean;
  activated: boolean;
  allowGameplay: boolean;
  preventLimitCancel: boolean;
  allowTransactions: boolean;
  loginBlocked: boolean;
  accountClosed: boolean;
  accountSuspended: boolean;
  gamblingProblem: boolean;
  riskProfile: RiskProfile;
  depositLimitReached: string | null;
  documentsRequested: boolean;
  pep: boolean;
  modified: {
    [key: string]: {
      timestamp: string | null;
      name: string | null;
    };
  };
}

export interface PlayerAccountStatusDraft {
  verified?: boolean;
  allowGameplay?: boolean;
  preventLimitCancel?: boolean;
  allowTransactions?: boolean;
  loginBlocked?: boolean;
  accountClosed?: boolean;
  accountSuspended?: boolean;
  gamblingProblem?: boolean;
  riskProfile?: RiskProfile;
  reason?: string;
  pep?: boolean;
}

export interface PlayerTransaction {
  amount: string;
  bonusAmount: string;
  bonusBalance: string;
  realBalance: string;
  rawAmount: string;
  rawBonusAmount: string;
  rawBonusBalance: number;
  rawRealBalance: number;
  type: string;
  transactionId: number;
  date: string;
  reservedBalance: number;
  roundId: number;
  externalRoundId: string;
  closed: boolean;
  externalTransactionId: string;
  bonus: string;
  description: string;
}

export interface PlayerPayment {
  id: string;
  key: string;
  date: string;
  type: string;
  paymentId: number;
  status: string;
  statusGroup: string;
  provider: string;
  bonus: string;
  account: string;
  amount: string;
  rawAmount: number;
  paymentFee: string;
  rawPaymentFee: number;
  transactionId: string;
  counterTarget: number;
  counterValue: number;
  counterId: number;
  counterType: string;
}

export interface PlayerBonus {
  bonus: string;
  status: string;
  formattedStatus: string;
  created: string;
  amount: string;
  wagering: string;
  balance: string;
  id: number;
  creditedBy: string;
  archived: boolean;
}

export interface PlayerAccount {
  id: number;
  account: string;
  active: boolean;
  accountHolder: string;
  withdrawals: boolean;
  parameters: Record<string, unknown>;
  method: string;
  created: string;
  lastUsed: string;
  kycChecked: boolean;
  kyc: string;
  allowWithdrawals: boolean;
  canWithdraw: boolean;
  documents: {
    id: number;
    expiryDate: string;
    photoId: number;
    content: string;
    name: string;
  }[];
}

export interface PlayerPaymentAccounts {
  accounts: PlayerAccount[];
  description: string;
}

export interface PlayerLimit {
  id: number;
  expires: string;
  permanent: boolean;
  exclusionKey: string;
  type: LimitType;
  limitValue: number;
  periodType: PeriodType;
  isInternal: boolean;
}

export interface PlayerFraud {
  id: number;
  fraudKey: string;
  fraudId: number;
  points: number;
  details?: { key: string; value: string }[];
  playerId: number;
  title: string;
  description: string;
  content: string | null;
  handle: string | null;
}

export interface PlayerPromotion {
  id: number;
  promotion: string;
  wagered: string;
  active: boolean;
  points: number;
}

export interface PlayerWithdrawals {
  accounts: unknown[];
  wagering: { wageringRequirement: number; wagered: number; completed: number; complete: boolean; bonus: boolean };
  withdrawalAllowed: boolean;
  accessStatus: {
    activated: boolean;
    allowGameplay: boolean;
    preventLimitCancel: boolean;
    allowTransactions: boolean;
    verified: boolean;
    loginBlocked: boolean;
    accountClosed: boolean;
    accountSuspended: boolean;
    gamblingProblem: boolean;
    riskProfile: RiskProfile;
    depositLimitReached: string | null;
    pep: boolean;
    documentsRequested: boolean;
    modified: {
      pep: { timestamp: string | null; name: string | null };
      verified: { timestamp: string | null; name: string | null };
      riskProfile: { timestamp: string | null; name: string | null };
    };
  };
  balance: { balance: number; bonusBalance: number; currencyId: string; numDeposits: number; brandId: string };
  bonuses: unknown[];
  counters: { amount: number; limit: number };
  withdrawalFeeConfiguration: { withdrawalFee: number; withdrawalFeeMin: number; withdrawalFeeMax: number };
}

export interface ConnectedPlayer {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  brandId: string;
  currencyId: string;
  riskProfile: string;
  totalDepositAmount: number;
}

export interface PlayerSentContent {
  name: string;
  type: string;
  timestamp: string;
  previewUrl: string;
  viewedAt?: string;
  clickedAt?: string;
}

export interface PlayerActiveCampaigns {
  name: string;
  addedAt: string;
  removedAt: string;
  emailSentAt: string;
  smsSentAt: string;
  complete: boolean;
}

export interface ProfileDraft {
  brandId: string;
  gameProfileId: number;
}

export interface AccountActive {
  id: number;
  active: boolean;
  withdrawals: boolean;
  kycChecked: boolean;
  account: string;
  accountHolder: string;
  documents?: Kyc[];
  parameters: Record<string, unknown>;
}

export interface Lock {
  id: number;
  handle: string;
}
