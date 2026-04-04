import {
  AppData,
  CmsPageOptions,
  Config,
  DefaultRegistration,
  Deposit,
  JefeLevels,
  JefeSpinWheel,
  JefeWheel,
  Notification,
  PendingWithdraw,
  Profile,
  RealityCheck,
  Reward,
  ShopItem,
  StartGameOptions,
  Subscription,
  TermsConditions,
  Update,
  Withdraw,
  LoginWithEmailDraft,
  LoginResponse,
  PhoneValidationResponse,
  SendCodeResponse,
  ResetPasswordResponse,
  RegistrationResponse,
  JefeBounty,
  Payment,
  HistorySummary,
  Transaction,
  CreateDepositResponse,
  Game,
  Exclusion,
  ApiExclusion,
  SubscriptionV2,
  UpdateSubscriptionV2,
  SnoozeSubscriptionV2,
  LoginRestriction
} from "@brandserver-client/types";

// TODO: add all types for the API
export interface Api {
  auth: {
    login: (lang: string, data: LoginWithEmailDraft) => Promise<LoginResponse>;
    pnpLogin: () => Promise<any>; // TODO: update type
    logout: () => Promise<{ ok: boolean }>;
  };
  registration: {
    defaultRegistration: (
      lang: string,
      data: DefaultRegistration
    ) => Promise<RegistrationResponse>;
  };
  phone: {
    validate: (
      lang: string,
      data: { countryISO: string; phone: string }
    ) => Promise<PhoneValidationResponse>;
    sendCode: (
      lang: string,
      data: { mobilePhone: string },
      retry?: boolean
    ) => Promise<SendCodeResponse>;
    login: (
      lang: string,
      data: {
        mobilePhone: string;
        pinCode: string;
      }
    ) => Promise<LoginResponse>;
  };
  password: {
    resetRequest: (
      lang: string,
      data: { email: string },
      retry?: boolean
    ) => Promise<ResetPasswordResponse>;
    resetComplete: (
      lang: string,
      data: {
        email: string;
        newPassword: string;
        pinCode: string;
      }
    ) => Promise<LoginResponse>;
  };
  cms: {
    getPage: (path: string) => Promise<CmsPageOptions>;
  };
  selfExclusion: {
    remove: (data: {
      exclusionKey: string;
      language: string;
      tz: number;
    }) => Promise<LoginRestriction>;
  };
  config: {
    getConfig: () => Promise<Config>;
  };
  profile: {
    getProfile: () => Promise<Profile>;
    updateLanguage: (language: string) => Promise<Profile>;
    changePassword: (data: {
      password: string;
      oldPassword: string;
    }) => Promise<
      { profile: Profile } & { ok?: boolean; result?: string; code?: string }
    >;
    setPassword: (data: {
      password: string;
    }) => Promise<
      { profile: Profile } & { ok?: boolean; result?: string; code?: string }
    >;
    selfExclusion: (duration: number) => Promise<Record<string, unknown>>;
  };
  games: {
    getGames: () => Promise<{ games: Game[]; update: Update } & AppData>;
    getFreeGames: (
      lang: string
    ) => Promise<{ games: Game[]; update: Update } & AppData>;
  };
  game: {
    startGame: (gameId: string) => Promise<{
      startGameOptions: StartGameOptions;
      update: Update;
    }>;
    startFreeGame: (gameId: string) => Promise<{
      startGameOptions: StartGameOptions;
      update: Update;
    }>;
    refreshGame: (game: any) => any;
  };
  locales: {
    getLocales: () => {
      [key: string]: { [key: string]: { [key: string]: string } };
    };
  };
  balance: {
    getBalance: () => Promise<{
      depleted: boolean;
      update: Update;
    }>;
  };
  realityCheck: {
    getStatistics: () => Promise<RealityCheck>;
  };
  campaignDialog: {
    getCampaignDialogContent: (
      locale: string,
      page: string
    ) => Promise<{ content: string }>;
  };
  termsConditions: {
    getBonusTerms: () => Promise<TermsConditions>;
    getPrivacyPolicy: () => Promise<TermsConditions>;
    getTermsConditions: () => Promise<TermsConditions>;
    confirmTermsConditions: () => Promise<{ ok: boolean }>;
  };
  register: {
    submitRegister: (data: {
      email: string;
      password: string;
      receivePromotional: string | null;
      accept: string;
      mobilePhone: string;
    }) => Promise<{ ok: boolean; result: string; nextUrl?: string }>;
  };
  questionnaires: {
    submitQuestionnaire: (
      id: string,
      data: FormData
    ) => Promise<{
      ok: boolean;
      requiredQuestionnaires: string[];
      code?: string;
      result?: string;
    }>;
  };
  wheel: {
    getJefeWheel: () => Promise<JefeWheel>;
    playJefeWheel: () => Promise<JefeSpinWheel>;
  };
  transactionHistory: {
    getTransactionHistory: () => Promise<{
      payments: Payment[];
      summary: HistorySummary;
      transactions: Transaction[];
    }>;
  };
  notifications: {
    getNotifications: () => Promise<Notification[]>;
    getNotification: (id: string) => Promise<Notification>;
    resendLink: (action: string) => Promise<Record<string, unknown>>;
  };
  pendingWithdraw: {
    getPendingWithdraw: () => Promise<PendingWithdraw[]>;
    removePendingWithdraw: (id: string) => Promise<PendingWithdraw[]>;
  };
  subscription: {
    getSubscription: () => Promise<Subscription>;
    updateSubscription: (data: URLSearchParams) => Promise<{ ok: boolean }>;
    resetSubscriptions: () => Promise<{ ok: boolean }>;
  };
  subscriptionV2: {
    getSubscription: (token?: string) => Promise<SubscriptionV2>;
    updateSubscription: (
      data: UpdateSubscriptionV2,
      token?: string
    ) => Promise<{ ok: boolean }>;
    snoozeSubscription: (
      data: SnoozeSubscriptionV2,
      token?: string
    ) => Promise<{ ok: boolean }>;
  };
  withdraw: {
    getWithdraw: () => Promise<Withdraw>;
    withdrawBalance: (
      data: URLSearchParams
    ) => Promise<{ update: Update; ok?: boolean }>;
    checkBankIdentify: (data: URLSearchParams) => Promise<any>;
    sendActivationLink: () => Promise<{ ok: boolean }>;
  };
  rewards: {
    getRewards: () => Promise<Reward[]>;
    getSingleReward: (id: string) => Promise<any>;
  };
  deposit: {
    getDeposit: () => Promise<Deposit>;
    createDeposit: (options: any) => Promise<CreateDepositResponse>;
    getDepositProcess: (
      id: string
    ) => Promise<{ status: "failed" | "pending" | "complete" }>;
    register: (data: { amount: string; bonus: string | null }) => Promise<{
      ok: boolean;
      ReturnURL: string;
      usesThirdPartyCookie: string;
    }>;
    pnp: (amount: string) => Promise<{
      ok: boolean;
      ReturnURL?: string;
      usesThirdPartyCookie: boolean;
    }>;
  };
  depositDone: {
    getDepositDone: () => Promise<any>;
  };
  levels: {
    getLevels: () => Promise<{ account: JefeLevels; update: Update }>;
  };
  shop: {
    getShop: () => Promise<{ shop: ShopItem[]; update: Update }>;
    getShopItem: (id: string) => Promise<any>;
  };
  bounties: {
    getBounties: () => Promise<{ bounties: JefeBounty[]; update: Update }>;
    getBounty: (id: string) => Promise<any>;
  };
  exclusion: {
    getExclusions: () => Promise<ApiExclusion>;
    setExclusion: (exclusion: Exclusion) => Promise<Exclusion>;
    removeExclusion: (key: string) => Promise<Exclusion>;
  };
}
