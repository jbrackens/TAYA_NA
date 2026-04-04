import {
  AccountActive,
  ActiveLimit,
  ActiveLimitOptions,
  Affiliate,
  AvailableBonusLimits,
  Bonus,
  BonusDraft,
  BonusLimit,
  CampaignsTab,
  CancelLimitAdditionalResponse,
  CancelLimitResponse,
  ChangePasswordRequest,
  ClosedAccount,
  ConnectedPlayer,
  CountrySettings,
  CountrySettingsDraft,
  CreateBonusRequest,
  Currency,
  DocumentBase,
  DocumentDraft,
  FullUser,
  GamblingProblemData,
  GameDraft,
  GameManufacturer,
  GameProfile,
  GameProfileSetting,
  GameRound,
  GameSettings,
  GamesSummary,
  Kyc,
  KycDocument,
  KycRequestDraft,
  LimitHistory,
  LimitType,
  LoginCredentials,
  LoginResponse,
  NewCampaign,
  NewPasswordDraft,
  PaymentAccountDraft,
  PaymentEvent,
  PaymentMethod,
  PaymentMethodProvider,
  PaymentProvider,
  PeriodType,
  Player,
  PlayerAccountStatus,
  PlayerAccountStatusDraft,
  PlayerActiveCampaigns,
  PlayerBonus,
  PlayerDraft,
  PlayerEvent,
  PlayerFinancialInfo,
  PlayerFraud,
  PlayerLimit,
  PlayerPayment,
  PlayerPaymentAccounts,
  PlayerPromotion,
  PlayerRegistrationInfo,
  PlayerStatus,
  PlayerTransaction,
  PlayerWithdrawals,
  PlayerWithUpdate,
  ProfileDraft,
  Promotion,
  Questionnaire,
  ReportType,
  Reward,
  RewardInitialGroups,
  RewardProgress,
  Risk,
  RiskDraft,
  RiskLog,
  RiskStatus,
  RiskType,
  Settings,
  SuspendReason,
  Transaction,
  TransactionDate,
  UpdateBonusLimitsRequest,
  UpdateBonusRequest,
  User,
  UserAccessSettings,
  UserCurrentAccessSettings,
  UserDraft,
  UserLog,
  WithdrawalEvent,
  WithdrawalWithOptions
} from "@idefix-backoffice/idefix/types";
import { Params } from "react-router-dom";

import { OKResponse, SuccessResponse } from "./common";

export type FetchApi = (
  url: string,
  config?: RequestInit & {
    params?: { [key: string]: any } | null;
  }
) => Promise<any>;

export interface AuthenticationAPI {
  login: (data: LoginCredentials) => Promise<LoginResponse>;
  logout: () => Promise<Record<string, unknown>>;
  expirePassword: () => Promise<Record<string, unknown>>;
}

export interface CampaignsAPI {
  getPlayerCampaigns: (values: NewCampaign) => Promise<Player[]>;
  getAffiliates: () => Promise<Affiliate[]>;
}

export interface KycAPI {
  get: (playerId: number) => Promise<Kyc[]>;
  getDocument: (playerId: number, kycDocumentId: number) => Promise<Kyc>;
  create: (playerId: number, photos: { id: string; originalName: string }[]) => Promise<KycDocument[]>;
  createContent: (playerId: number, content: string) => Promise<KycDocument[]>;
  verify: (playerId: number, kycDocumentId: number, document: DocumentBase) => Promise<OKResponse>;
  update: (playerId: number, kycDocumentId: number, documentDraft: DocumentDraft) => Promise<KycDocument>;
  decline: (playerId: number, kycDocumentId: number) => Promise<OKResponse>;
  updatePhoto: (playerId: number, kycDocumentId: number, documentDraft: DocumentDraft) => Promise<KycDocument>;
  requestDocuments: (playerId: number, values: KycRequestDraft) => Promise<PlayerAccountStatus>;
  // getKycRequest: (playerId: number) => Promise<KycRequest[]>;
}

export interface LocksAPI {
  get: () => Promise<Lock[]>;
  lock: (playerId: number) => Promise<{ playerId: number }>;
  steal: (playerId: number) => Promise<{ playerId: number }>;
  release: (playerId: number) => Promise<{ playerId: number }>;
}

export interface PhotosAPI {
  uploadPhoto: (photoDraft: string | Blob, photoName?: string) => Promise<{ id: string; originalName: string }>;
  removePhoto: (photoId: number) => Promise<OKResponse>;
  getDocument: (documentId: string) => Promise<any>;
}

export interface ReportsAPI {
  getReport: (type: ReportType, values: { brandId?: string; [key: string]: unknown }) => Promise<unknown>;
}

export interface SettingsAPI {
  load: () => Promise<Settings>;
  getBrandCountries: (brandId: string) => Promise<CountrySettings[]>;
  getCountries: () => Promise<CountrySettings[]>;
  updateCountry: (
    brandId: string,
    countryId: string,
    countryDraft: CountrySettingsDraft
  ) => Promise<Omit<CountrySettings, "name">>;
  getGames: () => Promise<GameSettings[]>;
  createGame: (gameDraft: GameDraft, profileDrafts: ProfileDraft[]) => Promise<GameSettings>;
  updateGame: (gameId: number, gameDraft: GameDraft) => Promise<GameSettings>;
  getGameProfiles: (gameId: number) => Promise<GameProfileSetting[]>;
  getAvailableGameProfiles: () => Promise<{
    brandId: string;
    brandName: string;
    availableProfiles: GameProfile[];
  }>;
  updateProfiles: (
    gameId: number,
    profileDrafts: {
      brandId: string;
      gameProfileId: number;
    }[]
  ) => Promise<{
    gameId: number;
    brandId: string;
    gameProfileId: number;
  }>;
  getGameManufacturers: () => Promise<GameManufacturer[]>;
  getGameManufacturer: (gameManufacturerId: string) => Promise<GameManufacturer & { blockedCountries: unknown[] }>;
  updateGameManufacturer: (
    gameManufacturerId: string,
    manufacturerDraft: Omit<GameManufacturer, "id" | "license" | "name" | "parentId">
  ) => Promise<OKResponse>;

  getBonuses: (brandId: string) => Promise<Bonus[]>;
  updateBonus: (bonusId: number, bonusDraft: UpdateBonusRequest) => Promise<OKResponse>;
  createBonus: (brandId: string, bonusDraft: CreateBonusRequest) => Promise<Bonus>;
  getBonusLimits: (bonusId: number) => Promise<BonusLimit[]>;
  getAvailableBonusLimits: (brandId: string) => Promise<AvailableBonusLimits>;
  updateBonusLimits: (bonusId: number, bonusLimitDrafts: UpdateBonusLimitsRequest) => Promise<BonusLimit>;

  getPaymentMethods: () => Promise<PaymentMethod[]>;
  getPaymentProviders: (paymentMethodId: number) => Promise<PaymentMethodProvider>;
  updatePaymentProviders: (
    paymentMethodId: number,
    values: Omit<PaymentMethodProvider, "id" | "name" | "paymentProviders">
  ) => Promise<OKResponse>;
  getPaymentProviderDetails: (paymentProviderId: number) => Promise<PaymentProvider>;
  updatePaymentProviderDetails: (paymentProviderId: number, values: unknown) => Promise<unknown>;

  getPromotions: (brandId: string) => Promise<Promotion[]>;
  createPromotion: (promotionDraft: Omit<Promotion, "id"> & { brandId: string }) => Promise<Promotion>;
  updatePromotion: (promotionId: number, promotionDraft: Omit<Promotion, "id">) => Promise<Promotion>;

  getGameProfileSettings: (brandId: string) => Promise<GameProfile[]>;
  createGameProfile: (gameProfileDraft: Omit<GameProfile, "id">) => Promise<GameProfile>;
  updateGameProfile: (gameProfileId: number, gameProfileDraft: Omit<GameProfile, "id">) => Promise<GameProfile>;

  getCurrencies: (brandId: string) => Promise<Currency[]>;
  archiveBonus: (bonusId: number) => Promise<true>;
  archivePromotion: (promotionId: number) => Promise<number[]>;

  getPromotionGames: (promotionId: number) => Promise<number[]>;
  addPromotionGames: (promotionId: number, games: number[]) => Promise<{ promotionId: number; gameId: number }[]>;
  updatePromotionGames: (promotionId: number, games: number[]) => Promise<number[]>;

  getRisks: (params?: { manualTrigger: boolean }) => Promise<Risk[]>;
  addRisk: (riskDraft: RiskDraft) => Promise<Risk>;
  updateRisk: (riskId: number, riskDraft: RiskDraft) => Promise<Risk>;
}

export interface UsersAPI {
  get: () => Promise<User[]>;
  getById: (userId: number) => Promise<FullUser>;
  getCurrentUserAccessSettings: () => Promise<UserCurrentAccessSettings>;
  getAccessSettings: (userId: number) => Promise<UserAccessSettings>;
  updateAccessSettings: (
    userId: number,
    accessSettingsDraft: Partial<UserAccessSettings>
  ) => Promise<UserAccessSettings>;
  getLog: (userId: number) => Promise<UserLog[]>;
  create: (userDraft: Partial<UserDraft>) => Promise<UserDraft>;
  update: (userId: number, userDraft: Partial<UserDraft>) => Promise<FullUser>;
  changePassword: (email: string, newPasswordDraft: ChangePasswordRequest) => Promise<SuccessResponse>;
  generateCode: (email: string) => Promise<boolean>;
  confirmCode: (confirmCodeDraft: { email: string; code: number }) => Promise<boolean>;
  resetPassword: (newPasswordDraft: NewPasswordDraft & { code: number }) => Promise<boolean>;
}

export interface PlayersAPI {
  get: (playerId: number) => Promise<PlayerWithUpdate>;
  getByIds: (playerIds: number[]) => Promise<PlayerWithUpdate[]>;
  getStatus: (playerId: number) => Promise<PlayerStatus>;
  getFinancialInfo: (playerId: number) => Promise<PlayerFinancialInfo>;
  getRegistrationInfo: (playerId: number) => Promise<PlayerRegistrationInfo>;
  getEvents: (playerId: number) => Promise<PlayerEvent[]>;
  getNotes: (playerId: number) => Promise<PlayerEvent[]>;
  createNote: (playerId: number, content: string) => Promise<PlayerEvent>;

  archiveNote: (playerId: number, noteId: number) => Promise<OKResponse>;

  getTransactions: (
    playerId: number,
    params: { startDate: string; endDate: string; pageIndex?: number; pageSize?: number; text?: string }
  ) => Promise<PlayerTransaction[]>;

  getTransactionDates: (playerId: number) => Promise<{ dates: TransactionDate[] }>;

  getPaymentTransactions: (
    playerId: number,
    params: { status: string[]; pageIndex?: number; pageSize?: number; text?: string }
  ) => Promise<PlayerPayment[]>;

  getPaymentTransactionsEventLogs: (playerId: number, paymentId: number) => Promise<PaymentEvent[]>;

  completeDepositTransaction: (
    playerId: number,
    transactionKey: string,
    depositTransactionDraft: {
      externalTransactionId: string;
      reason: string;
    }
  ) => Promise<OKResponse>;

  cancelPaymentTransaction: (
    playerId: number,
    transactionKey: string
  ) => Promise<{ playerId: number; transactionKey: string }>;

  addTransaction: (playerId: number, values: Transaction) => Promise<PlayerStatus>;

  getBonuses: (playerId: number) => Promise<PlayerBonus[]>;
  getAvailableBonuses: (playerId: number) => Promise<{ id: string; title: string }[]>;

  creditBonus: (playerId: number, bonusDraft: BonusDraft) => Promise<PlayerStatus>;

  createGamblingProblem: (data: GamblingProblemData) => Promise<OKResponse>;

  forfeitBonus: (playerId: number, bonusId: number) => Promise<PlayerStatus>;

  editPaymentWagering: (playerId: number, counterId: number, wageringRequirement: number) => Promise<OKResponse>;

  getPaymentAccounts: (playerId: number) => Promise<PlayerPaymentAccounts>;

  addPaymentAccount: (playerId: number, data: PaymentAccountDraft) => Promise<number>;

  addAccountDocument: (
    playerId: number,
    accountId: number,
    documentDraft: Partial<PaymentAccountDraft>
  ) => Promise<number>;

  updateAccountDocument: (
    playerId: number,
    accountId: number,
    documentId: number,
    documentDraft: {
      content: string;
      expiryDate: string;
    }
  ) => Promise<OKResponse>;

  removeAccountDocument: (playerId: number, accountId: number, documentId: number) => Promise<OKResponse>;

  getAccountStatus: (playerId: number) => Promise<PlayerAccountStatus>;
  updateAccountStatus: (playerId: number, accountStatusDraft: PlayerAccountStatusDraft) => Promise<PlayerAccountStatus>;

  getActiveLimits: (playerId: number) => Promise<ActiveLimitOptions>;
  getLimitsHistory: (playerId: number) => Promise<LimitHistory[]>;
  setLimit: (
    playerId: number,
    type: LimitType,
    values: {
      period: PeriodType;
      reason: string;
      duration?: number | "indefinite";
      limit?: number;
      isInternal?: boolean;
    }
  ) => Promise<PlayerLimit>;

  raiseLimit: (
    playerId: number,
    limitId: number,
    values: {
      reason: string;
      period: PeriodType;
      limit: number;
    }
  ) => Promise<PlayerLimit>;

  cancelLimit: (
    limit: ActiveLimit,
    delay: boolean,
    reason: string
  ) => Promise<CancelLimitResponse | CancelLimitAdditionalResponse>;

  updateAccountActive: (playerId: number, accountId: number, active: boolean) => Promise<AccountActive>;

  updateAccountWithdrawals: (playerId: number, accountId: number, withdrawals: boolean) => Promise<AccountActive>;

  updateAccount: (playerId: number, accountId: number, account: Partial<AccountActive>) => Promise<AccountActive>;

  update: (playerId: number, playerDraft: Partial<PlayerDraft>) => Promise<PlayerWithUpdate>;

  search: (
    tab: string,
    query: { text: string; brandId?: string; filters: Record<string, unknown> },
    taskType?: string
  ) => Promise<PlayerWithUpdate[]>;

  getWithdrawals: (playerId: number) => Promise<PlayerWithdrawals>;
  getWithdrawal: (withdrawalId: string) => Promise<WithdrawalWithOptions>;
  getWithdrawalEvents: (withdrawalId: string) => Promise<WithdrawalEvent[]>;
  acceptWithdrawal: (
    playerId: number,
    withdrawalId: string,
    paymentProviderId: number,
    amount: number,
    parameters?: { staticId?: number }
  ) => Promise<{
    withdrawalId: number;
    paymentProviderId: number;
    amount: number;
  }>;

  confirmWithdrawal: (
    playerId: number,
    withdrawalId: string,
    externalTransactionId: string
  ) => Promise<{ complete: boolean }>;

  acceptWithdrawalWithDelay: (
    playerId: number,
    withdrawalId: string,
    paymentProviderId: number,
    amount: number,
    parameters?: { staticId?: number }
  ) => Promise<{
    withdrawalId: number;
    paymentProviderId: number;
    amount: number;
  }>;

  refundGameRound: (roundId: number) => Promise<GameRound>;

  closeGameRound: (roundId: number) => Promise<GameRound>;

  getPlayerFraud: (playerId: number, fraudId: number) => Promise<PlayerFraud>;
  checkPlayerFraud: (
    playerId: number,
    fraudId: number,
    fraudDraft: {
      cleared: boolean;
      resolution?: string;
    }
  ) => Promise<OKResponse>;

  getTags: (playerId: number) => Promise<string[]>;
  addTag: (playerId: number, tag: string) => Promise<string[]>;
  removeTag: (playerId: number, tag: string) => Promise<string[]>;

  getPromotions: (playerId: number) => Promise<PlayerPromotion[]>;
  getSegments: (playerId: number) => Promise<string[]>;
  suspendAccount: (
    playerId: number,
    reasons: SuspendReason[],
    note: string,
    accountClosed: boolean
  ) => Promise<OKResponse>;

  getGamesSummary: (playerId: number, params: { startDate: string; endDate: string }) => Promise<GamesSummary[]>;

  getPlayersWithClosedAccounts: (playerId: number) => Promise<ClosedAccount[]>;
  getQuestionnaires: (playerId: number) => Promise<Questionnaire[]>;
  getStickyNote: (playerId: number) => Promise<{ content: string }>;
  updateStickyNote: (playerId: number, content: string) => Promise<OKResponse>;

  getRisks: (playerId: number, manualTrigger: boolean) => Promise<Record<RiskType | "total", number>>;
  getRisksByType: (playerId: number, riskType: RiskType) => Promise<RiskStatus[]>;
  getRisksLog: (playerId: number, riskType: RiskType) => Promise<RiskLog[]>;

  getConnectedPlayers: (playerId: number) => Promise<ConnectedPlayer[]>;
  addPlayerConnection: (playerId: number, playerIds: number[]) => Promise<OKResponse>;
  disconnectPlayerFromPerson: (playerId: number) => Promise<OKResponse>;

  addManualTask: (
    playerId: number,
    risk: {
      fraudKey: string;
      fraudId: string;
      note: string;
      checked: boolean;
    }
  ) => Promise<{ id: number }>;

  getLedgers: (playerId: number, params: Record<string | number, unknown>) => Promise<unknown>;

  markRewardUsed: (playerId: number, groupId: number, values?: { comment: string }) => Promise<unknown>;

  getRewards: (brandId: string, groupId: string) => Promise<{ data: Reward[] }>;

  addReward: (rewardId: number, values: { playerId: number; count: number; comment?: string }) => Promise<unknown>;

  getProgresses: (brandId: string, playerId: number) => Promise<{ data: { progresses: RewardProgress[] } }>;

  getBalances: (brandId: string, playerId: number) => Promise<{ data: unknown }>;

  getInitGroups: () => Promise<{ data: RewardInitialGroups }>;

  getCampaigns: (playerId: number, params: { pageSize: number }) => Promise<{ data: CampaignsTab }>;

  getActiveCampaigns: (playerId: number) => Promise<{ data: PlayerActiveCampaigns[] }>;
}
