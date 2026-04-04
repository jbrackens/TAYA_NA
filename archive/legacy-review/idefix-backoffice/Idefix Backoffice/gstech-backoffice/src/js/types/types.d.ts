declare module "app/types" {
  //#region Responses
  export interface OKResponse {
    ok: boolean;
  }

  export interface SuccessResponse {
    success: boolean;
  }

  //#endregion

  //#region User
  export interface User {
    id: number;
    accountClosed: boolean;
    administratorAccess: boolean;
    reportingAccess: boolean;
    loginBlocked: boolean;
    requirePasswordChange: boolean;
    email: string;
    handle: string;
    name: string;
    mobilePhone: string;
    createdAt: string;
    lastSeen: string;
    lastPasswordReset: string;
  }

  export interface FullUser extends User {
    hash: string;
    badLoginCount: number;
    lastBadLogin: string;
    campaignAccess: boolean;
    paymentAccess: boolean;
    riskManager: boolean;
  }

  export interface UserCurrentAccessSettings {
    reportingAccess: boolean;
    administratorAccess: boolean;
    paymentAccess: boolean;
    campaignAccess: boolean;
    riskManager: boolean;
  }

  export interface UserAccessSettings extends UserCurrentAccessSettings {
    accountClosed: boolean;
    loginBlocked: boolean;
    requirePasswordChange: boolean;
  }

  export interface UserLog {
    event: string;
    time: string;
    ip: string;
  }

  export interface UserDraft {
    name: string;
    mobilePhone: string;
    accountClosed: boolean;
    administratorAccess: boolean;
    badLoginCount: number;
    campaignAccess: boolean;
    createdAt: string;
    email: string;
    handle: string;
    hash: string;
    id: number;
    lastBadLogin: null | number;
    lastPasswordReset: string;
    lastSeen: string;
    loginBlocked: boolean;
    paymentAccess: boolean;
    reportingAccess: boolean;
    requirePasswordChange: boolean;
    riskManager: boolean;
  }

  //#endregion

  //#region Player
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
    additionalFields: {};
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
    balance: number;
    bonusBalance: number;
    totalBalance: number;
    totalBetAmount: number;
    totalWinAmount: number;
    rtp: number;
    depositCount: number;
    withdrawalCount: number;
    totalDepositAmount: number;
    totalWithdrawalAmount: number;
    depositCountInSixMonths: number;
    depositAmountInSixMonths: number;
    withdrawalCountInSixMonths: number;
    withdrawalAmountInSixMonths: number;
    creditedBonusMoney: number;
    bonusToReal: number;
    freespins: number;
    compensations: number;
    bonusToDepositRatio: number;
    depositsMinusWithdrawals: number;
    depositsMinusWithdrawalsInSixMonths: number;
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
      [key: string]: any;
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
    parameters: {};
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
    accounts: any[];
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
    bonuses: any[];
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

  //#endregion

  //#region Payment
  export interface PaymentMethod {
    id: number;
    name: string;
    active: boolean;
    allowAutoVerification: boolean;
    highRisk: boolean;
    requireVerification: boolean;
  }

  export interface PaymentMethodLimit {
    brandId: string;
    currencyId: string;
    paymentMethodId: number;
    minDeposit: number;
    maxDeposit: number;
    minWithdrawal: number;
    maxWithdrawal: number;
  }

  export interface PaymentProvider {
    id: number;
    name: string;
    deposits: boolean;
    withdrawals: boolean;
    paymentMethodId: number;
    active: boolean;
    priority: number;
    currencies: any[];
    countries: any[];
  }

  export interface PaymentMethodProvider {
    id: number;
    name: string;
    active: boolean;
    requireVerification: boolean;
    allowAutoVerification: boolean;
    highRisk: boolean;
    paymentProviders: Omit<PaymentProvider, "currencies" | "countries">[];
  }

  export interface PaymentEvent {
    timestamp: string;
    status: string;
    message: string;
    handle: string;
  }

  export interface PaymentAccountDraft {
    method: string;
    account: string;
    accountHolder?: string;
    kycChecked?: boolean;
    parameters?: {};
    documents?: AccountDocument[];
  }

  //#endregion

  //#region Settings
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

  export interface CountrySettingsDraft extends Omit<CountrySettings, "brandId" | "id" | "name"> {}

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
      type: string;
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

  export interface GameDraft extends Omit<GameSettings, "id"> {}

  //#endregion

  //#region Limit
  export type LimitType = "selfExclusion" | "deposit" | "bet" | "loss" | "sessionLength" | "timeout";

  export interface ActiveLimit {
    id: number;
    createdAt: string;
    expires: string;
    permanent: string;
    exclusionKey: string;
    type: LimitType;
    limitValue: number;
    limit: number;
    amount: string;
    periodType: string;
    reason: string;
    isInternal: boolean;
    display: string;
    canBeCancelled: boolean;
    cancellationDays: number;
  }

  export interface LimitHistory {
    type: string;
    periodType: string;
    status: string;
    startTime: string;
    endTime: string;
    amount: string;
    reason: string;
    isInternal: boolean;
  }

  export type ActiveLimitOptions = Record<LimitType, ActiveLimit>;

  export type PeriodType = "daily" | "weekly" | "monthly";

  export interface CancelLimitResponse {
    playerId: number;
    expires: string;
    exclusionKey: string;
  }

  export interface CancelLimitAdditionalResponse {
    playerId: number;
    cancelled: string;
  }

  export interface CancelLimitValues {
    reason: string;
  }

  //#endregion

  //#region Reward
  export interface RewardGroup {
    groupId: string;
    groupName: string;
    rewardTypes: string[];
    balanceGroup?: boolean;
    table: { title: string; property: string; type?: string }[];
  }

  export type RewardInitialGroups = Record<string, RewardGroup[]>;

  export interface RewardProgress {
    betCount: string;
    contribution: number;
    progress: number;
    rewardType: string;
    rewards: { reward: { id: string; externalId: string; description: string } }[];
    startedAt: string;
    target: number;
    updatedAt: string;
  }

  export interface Reward {
    reward: {
      id: number;
      rewardDefinitionId: number | null;
      creditType: string;
      bonusCode: string;
      externalId: string;
      cost: number;
      currency: null;
      description: string;
      gameId: number;
      metadata: { [key]: string };
      order: number;
      price: number;
      spinType: string;
      spinValue: number;
      spins: string;
      validity: null | string;
      removedAt: null | string;
      active: boolean;
    };
    game: {
      id: number;
      active: boolean;
      order: number;
      brandId: string;
      permalink: string;
      name: string;
      manufacturer: string;
      primaryCategory: string;
      aspectRatio: string;
      viewMode: string;
      thumbnailId: number | null;
      parameters: any;
      newGame: boolean;
      keywords: string;
      jackpot: boolean;
      searchOnly: boolean;
      tags: string[];
      removedAt: string | null;
    };
  }

  //#endregion

  //#region Kyc
  export interface Kyc {
    id: number;
    status: string;
    documentType: DocumentType;
    type: string;
    expiryDate: string | Date;
    photoId: string | null;
    name: string;
    account: string | null;
    accountId: number | string | null;
    content: string | null;
    kycChecked: boolean;
    fields: {} | null;
  }

  export interface KycRequest {
    id: number;
    status: string;
    documentType: string;
    type: string;
    expiryDate: string;
    photoId: number;
    name: string;
    account: string;
    accountId: number;
    content: string;
    fields: {};
    requestId: number;
    handle: string;
  }

  export interface KycRequestDraft {
    automatically: boolean;
    note: string;
    message: string;
    documents: {
      type: string;
      accountId: number;
    }[];
  }

  export interface KycDocument {
    id: number;
    playerId: number;
    accountId: number;
    type: string;
    status: string;
    expiryDate: string;
    name: string;
    content: string;
    photoId: number;
    createdAt: string;
    fields: {};
  }

  //#endregion

  //#region Document
  export type DocumentType = "other" | "utility_bill" | "identification" | "payment_method" | "source_of_wealth";

  export interface DocumentBase {
    type: DocumentType;
    expiryDate: string | Date;
    accountId?: number | string | null;
    kycChecked: boolean;
    content?: string | null;
    fields: {};
  }

  export interface DocumentDraft extends Partial<DocumentBase> {
    photoId: string | null;
    name?: string;
  }

  export interface AccountDocument {
    id: number;
    photoId: string;
    name: string;
    originalName?: string;
    expiryDate: string | Date | null;
    content: string | null;
    formStatus?: string;
  }

  //#endregion

  //#region Bonus
  export interface Bonus {
    id: number;
    name: string;
    description: string;
    brandId: string;
    archived: boolean;
    active: boolean;
    depositBonus: boolean;
    depositCount: number;
    depositCountMatch: boolean;
    wageringRequirementMultiplier: number;
    daysUntilExpiration: number;
    depositMatchPercentage: number;
    creditOnce: boolean;
  }

  export interface BonusLimit {
    currencyId: string;
    bonusId: number | null;
    minAmount: number | null;
    maxAmount: number | null;
  }

  export interface CreateBonusValues {
    name: string;
    active: boolean;
    depositBonus: boolean;
    depositCount: number;
    depositCountMatch: boolean;
    wageringRequirementMultiplier: number;
    daysUntilExpiration: number;
    depositMatchPercentage: number;
    creditOnce: boolean;
    limits: BonusLimit[];
  }

  export type AvailableBonusLimits = BonusLimit[];

  export type UpdateBonusLimitsRequest = Omit<BonusLimit, "bonusId">[];

  export type CreateBonusRequest = Omit<
    CreateBonusValues,
    "limits" | "depositCount" | "depositCountMatch" | "depositMatchPercentage"
  > & {
    depositCount?: number;
    depositCountMatch?: boolean;
    depositMatchPercentage?: number;
  };

  export type UpdateBonusRequest = CreateBonusRequest;

  export interface BonusDraft {
    id: string;
    amount: number;
    expiryDate?: string;
  }

  //#endregion

  //#region Game
  export interface GameProfileSetting {
    brandId: string;
    brandName: string;
    gameProfileId: string;
    availableProfiles: GameProfile[];
  }

  export interface GameManufacturer {
    id: string;
    name: string;
    parentId: string;
    license: string;
    active: boolean;
  }

  export interface GameProfile {
    name: string;
    brandId: string;
    wageringMultiplier: number;
    riskProfile: RiskProfile;
    id: number;
  }

  export interface GameRound {
    id: number;
    timestamp: string;
    manufacturerSessionId: number;
    manufacturerId: string;
    externalGameRoundId: string;
    gameId: number;
    closed: boolean;
  }

  export interface GamesSummary {
    name: string;
    manufacturer: string;
    betCount: number;
    type: string;
    realBets: string;
    bonusBets: string;
    realWins: string;
    bonusWins: string;
    averageBet: string;
    biggestWin: string;
  }

  //#endregion

  //#region Risk
  export type RiskProfile = "low" | "medium" | "high";

  export type RiskType = "customer" | "transaction" | "interface" | "geo";

  export type RiskRole = "administrator" | "riskManager" | "payments" | "agent";

  export interface RiskDraft {
    type: RiskType;
    fraudKey: string;
    points: number;
    maxCumulativePoints: number;
    requiredRole: RiskRole;
    active: boolean;
    name: string;
    title: string;
    description: string;
    manualTrigger: boolean;
  }

  export interface Risk extends RiskDraft {
    id: number;
    riskProfiles: string[];
    manualCheck: boolean;
  }

  export interface RiskStatus {
    fraudKey: string;
    name: string;
    count: number;
    contribution: number;
    latestOccurrence: string;
  }

  export interface RiskLog {
    id: number;
    createdAt: string;
    fraudKey: string;
    name: string;
    points: number;
    handle: string;
  }

  //#endregion

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

  export type Operator = "<" | ">" | "=" | "=<" | "=>" | "between";

  export interface LoginCredentials {
    email: string;
    password: string;
  }

  export interface BrandInit {
    id: string;
    name: string;
    site: string;
    url: string;
    cdnUrl: string;
  }

  export interface LoginResponse {
    userId: number;
    token: string;
    settings: {
      brands: BrandInit[];
    };
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

  interface Lock {
    id: number;
    handle: string;
  }

  export interface ProfileDraft {
    brandId: string;
    gameProfileId: number;
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

  export interface Currency {
    id: number;
    symbol: string;
    defaultConversion: number;
  }

  export type EventType = "note" | "account" | "activity" | "fraud" | "transaction";

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

  //#region Ticket
  export interface Ticket {
    id: string;
    externalTicketId: string;
    content: TicketContent;
    createdAt?: string;
    updatedAt?: string;
  }

  export interface TicketContent {
    stake: TicketAmount;
    wonAmount?: TicketAmount;
    possibleWinAmount: TicketAmount;
    date: string;
    status: string;
    bets: TicketBet[];
    bonusWonAmount?: TicketBonusAmount;
    bonusStale?: TicketBonusAmount;
  }

  export interface TicketAmount {
    amount: number;
    tax?: number;
    totalAmount: number;
  }

  export interface TicketSelection {
    id: string;
    outcome: TicketOutcome;
    odds: number;
    event: TicketEvent;
    voided?: boolean;
    won?: boolean;
  }

  export interface TicketOutcome {
    name: string;
    id: number;
    marketId: string;
    marketName: string;
  }

  export interface TicketEvent {
    id: string;
    tournamentId: string;
    tournamentName: string;
    sportId: string;
    sportName: string;
    dateStart: string;
    teams?: TicketEventTeam[];
    isLive?: boolean;
  }

  export interface TicketBet {
    id: string;
    stake: TicketAmount;
    selections: TicketSelection[];
    won?: boolean;
    voided?: boolean;
    wonAmount?: TicketAmount;
    totalOdds: number;
    systems: number[];
    bonusWonAmount?: TicketBonusAmount;
    bonusStake?: TicketBonusAmount;
    bonuses?: TicketBonus[];
  }

  export interface TicketEventTeam {
    name: string;
    id?: string;
    isHome?: boolean;
  }

  export interface TicketBonusAmount {
    virtual?: number;
    nonWinning?: number;
    winning?: number;
    total: number;
    free?: number;
    tax?: number;
  }

  export interface TicketBonus {
    id: string;
  }

  //#endregion

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

  export interface AccountActive {
    id: number;
    active: boolean;
    withdrawals: boolean;
    kycChecked: boolean;
    account: string;
    accountHolder: string;
    documents?: Kyc[];
    parameters: {};
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
      parameters: {};
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

  export interface Photo {
    id: string;
    name?: string;
    originalName?: string;
    formStatus: string;
  }

  export interface NewPasswordDraft {
    email: string;
    newPassword: string;
    confirmPassword: string;
  }

  export interface ChangePasswordRequest {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }

  export interface ChangePasswordValues extends ChangePasswordRequest {
    email: string;
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
}
