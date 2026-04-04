/* @flow */
import type { SessionToken } from 'gstech-core/modules/clients/backend-api-types';
import type { PlayerWithDetails, PlayerDraft, CommunicationMethodStatus } from 'gstech-core/modules/types/player';
import type {
  PartialLoginWithParameters,
  Bonus as BackendBonus,
  GameWithBlockedCountries as BackendGame,
} from 'gstech-core/modules/types/backend';
import type { CMoney, Money } from 'gstech-core/modules/money-class';

import type { LegacyCreditType } from './import-tools';
import type { Balance } from './modules/balance/types';
import type { CampaignDef } from './campaign';
import type { BonusBanner } from './common-journey';

const api = require('gstech-core/modules/clients/backend-auth-api');
const moment = require('moment-timezone');
const _ = require('lodash');
const querystring = require('querystring');
const configuration = require('./configuration');
const client = require('./client');
const logger = require('./logger');
const { authentication } = require('./bi-api');

moment.tz.setDefault('Europe/Rome');

export type APISession = { sessionKey: string };
export type APIUser = { username: string };
export type ClientInfo = { ipAddress: string, userAgent: string, isMobile: boolean };
export type PlayerRef = APISession | APIUser;


export type RawGameInfo = {
  id: string, // gameId
  manufacturerName: string,
  playForFun: boolean
} & BackendGame;

export type Bonus = {
  id: Id,
  activeBonus: string,
  minAmount: number,
  maxAmount: number,
  maxBonus: number,
  percentage: number,
  bonusPercentage: string,
  bonusMinAmount: string,
  bonusMaxAmount: string,
  bonusMaxValue: string,
  wageringRequirement: number,
};

export type Deposit = {
  paymentId: Id,
  playerId: Id,
  timestamp: Date,
  transactionKey: string,
  paymentMethodId: Id,
  status: 'created' | 'pending' | 'complete' | 'failed' | 'cancelled',
  message: string,
  amount: Money,
  parameters: any,
  index: number,
  paymentFee: Money,
  counterId: ?Id,
  counterValue: ?Money,
  counterTarget: ?Money,
};

export type Username = string;
export type LegacyBoolean = '1' | '0' | true | false | 1 | 0;
export type LegacyStringBoolean = 'true' | 'false';
export type LangDef = {
  code: string,
  LanguageISO?: string
};
export type ObjectID = string;

export type CountryDef = {
  CurrencyISO: string,
  CountryISO: string,
  CountryName: string,
};

export type LegacyPlayer = {
  LanguageISO: string, // remove
  Address1: string, // remove
  City: string, // remove
  ClientID: string,
  ClientStatID: string,
  CountryISO: string,
  CurrencyISO: string,
  DateOfBirth: string,
  EmailAddress: string, // Remove
  FirstName: string,
  IsKYCChecked: LegacyStringBoolean, // remove
  LastName: string, // remove
  MobilePhone: string,
  PostCode: string, // remove
  ReceivePromotionalByEmail: boolean,
  ReceivePromotionalBySMS: boolean,
  Username: Username, // remove
  NumDeposits: number, // remove
  TCVersion: number,
  Activated: boolean,
  Tags: ?(string[]),
  DDFlagged: boolean,
  DDLocked: boolean,
  DDRequireDate: ?Date,
  RegistrationSource: ?string,
  AffiliateRegistrationCode: ?string,
  Pnp: boolean,
  SignUpDate?: Date,
  AccountActivated?: boolean,
  RealityCheckMinutes: number,
};

export type DepositDetails = {
  amountValue: Money,
  tags: string[],
  campaignIds: string[],
  index: number,
};

export type Player = {
  details: LegacyPlayer,
  username: Username,
  email: string,
  languageISO: string,
  numDeposits: number,
};

export type RequestContext = {
  mobile: boolean,
  spider: boolean,
  country: CountryDef,
  languageISO: string,
  currencyISO: string,
  countryISO: string,
  playerId: Id,
  detect: any,
  whitelisted: boolean,
};

export type Request = express$Request;

export type Notification = {
  id: string,
  content: string,
  banner: string,
  actiontext: string,
  disclaimer: string,
  openOnLogin: boolean,
  image: string,
  action: string,
  title: string,
  important: boolean,
};

export type Reward = {
  cost: number,
  type: LegacyCreditType,
  spins: number,
};

export interface Journey {
  init: () => Promise<void>;
  activeNotifications: (context: RequestContext, type: string) => Notification[];
  getReward: (id: string) => Promise<?Reward>;
  bonuses: ?(Bonus[]);
  activeBonuses: () => BonusBanner[];
  activeCampaigns: (extraTags?: string[]) => Promise<CampaignDef[]>; // TODO: this can be removed when jefe campaigns are migrated
  checkTags: (tags: string[]) => boolean;
  tags: string[];
  req: express$Request;
  balance: ?Balance;
  details: ?LegacyPlayer;
  level: () => number;
}

export type Authentication =
  | { user: Player }
  | { session: APISession }
  | { username: string }
  | Request;

export type PaymentMethod = {
  PaymentMethod: string,
  PlayerLowerLimit: Money,
  PlayerUpperLimit: Money,
  accounts: {
    accountId: string,
    account: string,
  }[],
  providerId: Id,
};

export type LegacyPlayerDraft = {
  ipAddress: IPAddress,
  userAgent: string,
  firstName: string,
  lastName: string,
  password: string,
  emailAddress: string,
  address: string,
  postCode: string,
  city: string,
  countryId: string,
  dateOfBirth: string,
  mobilePhone: string,
  languageId: string,
  currencyId: string,
  affiliateRegistrationCode: string,
  receivePromotional: LegacyBoolean,
  activateAccount?: LegacyBoolean,
  registrationSource?: string,
  tcVersion: number,
  mobilePhoneStatus?: CommunicationMethodStatus,
  emailStatus?: CommunicationMethodStatus,
  pinCode?: string,
};

export type APIBonus = {
  BonusRuleID: Id,
  Name: string,
  BonusMinDepositAmount: Money,
  BonusPercentageMaxAmount: Money,
  Percentage: number,
  CurrencyCode: string,
  Wagering: number,
};

type CompletePartialLogin = {
  SessionKey: any,
  player: LegacyPlayer
};

type StartDepositValuesParam = {
  paymentMethod: string,
  bonusId: string,
  amount: Money,
  fee: ?CMoney,
  parameters: mixed
}

type LoginWithPhoneNumberResponse = {
  SessionKey: any,
  player: LegacyPlayer
}

type GetFullDetailsResponse = {
  player: LegacyPlayer,
  bonuses: APIBonus[],
  balance: Balance,
};

type PlayerValidateEmailExistsValuesParam = {
  emailAddress: string
}

type PlayerValidateEmailExistsResponse = {
  Exists: string,
  valid: any,
};

export type PlayerRegisterAccountResponse = {
  ActivationCode: UUID,
  IsActivated: string,
  LoginReturn: {
    SessionKey: SessionToken,
  },
  player: LegacyPlayer,
};

type PlayerUpdateAccountValuesParam = {
  updatePasswordData: {
    OldPassword: string,
    NewPassword: string,
  },
  ...APISession
};

type PlayerActivateAccountValuesParam = {
  activateCode: string,
  ipAddress: IPAddress
};

type PlayerActivateViaEmailVerificationValuesParam = {
  username: string,
  ipAddress: IPAddress
};

type SessionLoginWithCustomInfoResponse = {
  SessionKey: any, player: LegacyPlayer
}

type SessionCheckResponse = {
  IsLoggedIn: string
}

type SessionGetSessionStatisticsResponse = {
  AmountBet: any,
  AmountLost: any,
  AmoutWin: any,
  PlayTimeMinutes: any
}

type TransactionGetAllDepositMethodsResponse = {
  accessStatus: {
    KycChecked: string
  },
  bonuses: APIBonus[],
  depositMethods: PaymentMethod[],
  limits: any,
}

type TransactionProceedWithDepositResponse = {
  CanProceed: string,
  FailureReason: null,
  TransactionKey: any
}

export type GameStartGameResponse = {
  GameHTML: any,
  GameURL: any,
  InitScript: any
}

type GameStartGamePlayForFunAsGuestValuesParam = {
  gameID: string,
  customOptions: ?{
    LanguageCode: string,
    currencyISO: string
  },
  client: ClientInfo,
  currencyId?: string,
  languageId?: string,
};
type GameStartGamePlayForFunAsGuestResponse = {
  GameHTML: any,
  GameURL: any,
  InitScript: any
};

type FraudCheckValuesParam = {
  username: Username,
  fraudKey: string,
  fraudId: string,
  details: mixed,
  ...?APISession
};

const levelWager = [3000, 10000, 50000, 100000, 200000, 500000, 1000000, 100000000, Number.MAX_SAFE_INTEGER];

const playerIdMapping = { luckydino: 0, jefe: 1000000, kalevala: 2000000 }[configuration.project()] || 0;

const auth = (ref: PlayerRef): ?{ Authorization: string } => {
  const r: any = ref;
  if (ref.sessionKey) return { Authorization : `Token ${r.sessionKey}`};
  if (ref.username) return { Authorization : `Bearer ${r.username}`};
  logger.warn('Unable to create auth', { ref });
};

const mapClientStatId = (id: number) => {
  if (id < 3000000) {
    return id - playerIdMapping;
  }
  return id;
};

const mapLevel = (balance: {
  CurrencyISO: any,
  CurrentBonusBalance: any,
  CurrentRealBalance: any,
  NumDeposits: any,
  bonuses: any,
}, promo: empty) => {
  if (balance.NumDeposits === 0) return 1;
  if (balance.NumDeposits < 3) return 2;
  const idx = _.findIndex(levelWager, w => promo.Points < w);
  const cLevel = idx + 3;
  return Math.min(10, cLevel);
};

const mapPromotions = (res: any) =>
  res.map(promotion => ({
    Promotion: {
      Name: promotion.promotion,
    },
    TotalBet: promotion.wagered,
    Points: promotion.points,
  }));

const mapBalance = (res: any) => ({
  CurrencyISO: res.currencyId,
  CurrentBonusBalance: res.bonusBalance,
  CurrentRealBalance: res.balance,
  NumDeposits: res.numDeposits,
  bonuses: res.bonuses,
});

const mapAccessStatus = (res: any) => ({
  KycChecked: res.verified ? 'true' : 'false',
});

const mapPlayerDetails = (response: PlayerWithDetails): LegacyPlayer => ({
  LanguageISO: response.languageId.toUpperCase(),
  AccountActivated: response.activated,
  Address1: response.address,
  City: response.city,
  ClientID: `${response.id}`,
  ClientStatID: `${mapClientStatId(response.id)}`,
  CountryISO: response.countryId,
  CurrencyISO: response.currencyId,
  DateOfBirth: response.dateOfBirth,
  EmailAddress: response.email,
  FirstName: response.firstName,
  IsKYCChecked: response.verified ? 'true' : 'false',
  LastName: response.lastName,
  MobilePhone: response.mobilePhone,
  PostCode: response.postCode,
  ReceivePromotionalByEmail: response.allowEmailPromotions,
  ReceivePromotionalBySMS: response.allowSMSPromotions,
  SignUpDate: response.createdAt,
  Username: response.username,
  NumDeposits: response.numDeposits,
  TCVersion: response.tcVersion,
  Activated: response.activated,
  Tags: response.tags,
  DDFlagged: response.dd && response.dd.flagged,
  DDLocked: response.dd && response.dd.locked,
  DDRequireDate: response.dd && response.dd.lockTime,
  RegistrationSource: response.registrationSource,
  AffiliateRegistrationCode: response.affiliateRegistrationCode,
  Pnp: response.pnp,
  RealityCheckMinutes: response.realityCheckMinutes,
});

const mapLegacyPlayer = (details: LegacyPlayer): Player => ({
    username: details.Username,
    details,
    email: details.EmailAddress ? details.EmailAddress.toLowerCase() : details.EmailAddress,
    languageISO: details.LanguageISO,
    numDeposits: details.NumDeposits,
  });
export type MappedGame = {
  Permalink: string,
  GameName: string,
  ManufacturerName: string,
  GameID: string,
  HasPlayForFun: 'true' | 'false',
  Mobile: boolean,
  Name: string,
  BlockedCountries: string[]
}

const mapGame = (game: RawGameInfo): MappedGame => ({
  Permalink: game.permalink,
  GameName: game.gameId,
  ManufacturerName: game.manufacturerName,
  GameID: game.id,
  HasPlayForFun: game.playForFun ? 'true' : 'false',
  Mobile: game.mobileGame,
  Name: game.name,
  BlockedCountries: game.blockedCountries,
});

const mapBonus = (currencyId: any, bonus: BackendBonus): APIBonus => ({
  BonusRuleID: bonus.id,
  Name: bonus.name,
  BonusMinDepositAmount: bonus.minAmount,
  BonusPercentageMaxAmount: bonus.maxAmount,
  Percentage: bonus.depositMatchPercentage / 100,
  CurrencyCode: currencyId,
  Wagering: bonus.wageringRequirementMultiplier,
});

const getAccount = (req: Authentication, accountId: string): Promise<any> =>
  client.execute(`accounts/${accountId}`, 'GET', {}, authentication(req));
const giveBonus = (req: Authentication, bonusCode: string): Promise<any> =>
  client.execute(`bonuses/${bonusCode}/give`, 'POST', {}, authentication(req));
const creditBonus = (req: Authentication, bonusCode: string): Promise<any> =>
  client.execute(`bonuses/${bonusCode}/credit`, 'POST', {}, authentication(req));
const getDeposit = (transactionKey: string): Promise<any> =>
  client.execute(`deposit/${transactionKey}`, 'GET');
const createWageringRequirement = (
  req: Authentication,
  transactionKey: string,
  wageringRequirement: CMoney,
): Promise<any> =>
  client.execute(
    `deposit/${transactionKey}/wager`,
    'PUT',
    { wageringRequirement: wageringRequirement.asFixed() },
    authentication(req),
  );
// TODO use backend-limits-api instead
const removeSelfExclusion = (exclusionKey: UUID): Promise<any> =>
  client.execute(`exclusions/${exclusionKey}`, 'DELETE', {});
const topGames = (req: Authentication): Promise<any> =>
  client.execute('games/top', 'GET', {}, authentication(req));
const addNote = (req: Authentication, content: string): Promise<any> =>
  client.execute('notes', 'POST', { content }, authentication(req));
const updateMobilePhoneStatus = (
  req: Authentication,
  mobilePhoneStatus: CommunicationMethodStatus,
): Promise<any> => client.execute('details', 'POST', { mobilePhoneStatus }, authentication(req));
const updateEmailStatus = (
  req: Authentication,
  emailStatus: CommunicationMethodStatus,
): Promise<any> => client.execute('details', 'POST', { emailStatus }, authentication(req));
const updateTcVersion = (req: Authentication, tcVersion: number): Promise<any> =>
  client.execute('details', 'POST', { tcVersion }, authentication(req));
const requestActivationToken = (req: Authentication): Promise<any> =>
  client.execute('activate', 'GET', {}, authentication(req));
const deposits = (req: Authentication, items: number = 100, page: number = 0): Promise<any> =>
  client.execute('deposits', 'GET', { items, page }, authentication(req));
const executeDeposit = (
  req: Authentication,
  accountId: ?string,
  transactionKey: string,
  params: any,
  ok: string,
  failure: string,
  clientInfo: ClientInfo,
): Promise<any> =>
  client.execute(
    'executedeposit',
    'POST',
    { accountId, transactionKey, params, urls: { ok, failure }, client: clientInfo },
    authentication(req),
  );
const createIdentification = (
  req: Authentication,
  paymentProvider: string,
  ok: string,
  failure: string,
): Promise<any> =>
  client.execute(
    'identify',
    'POST',
    { paymentProvider, urls: { ok, failure } },
    authentication(req),
  );
const accountStatement = (req: express$Request): Promise<any> =>
  client.execute('statement', 'GET', {}, authentication(req));
const getTransactions = (req: express$Request, month: string): Promise<any> =>
  client.execute(`statement/${month}`, 'GET', {}, authentication(req));
const tag = (req: Authentication, tag: string): Promise<void> =>
  client.execute('tags', 'POST', { tag }, authentication(req));
const startPartialLogin = (
  req: express$Request,
  transactionKey: string,
  paymentMethod: string,
  amount: Money,
  bonusId: ?number,
  player: Partial<PlayerDraft>,
  ok: string,
  failure: string,
  clientInfo: ClientInfo,
): Promise<any> =>
  client.execute('partial/login', 'POST', {
    transactionKey,
    paymentMethod,
    amount,
    bonusId,
    player,
    urls: { ok, failure },
    client: clientInfo,
  });
const completePartialLogin = (
  transactionKey: string,
  ipAddress: IPAddress,
  userAgent: string,
): Promise<CompletePartialLogin> =>
  client.execute(`partial/login/${transactionKey}`, 'POST', { ipAddress, userAgent });
const getPartialLogin = (transactionKey: string): Promise<PartialLoginWithParameters> =>
  client.execute(`partial/login/${transactionKey}`, 'GET');

const getRequiredQuestionnaires = async (req: Authentication): Promise<any> => {
  const { result } = await client.execute('questionnaires/required', 'GET', {}, authentication(req));
  return result;
};

const answerQuestionnaire = async (req: Authentication, id: string, response: mixed): Promise<any> => {
  const { result } = await client.execute(`questionnaires/${id}`, 'POST', response, authentication(req));
  return result;
};


const startDeposit = async (req: Authentication, values: StartDepositValuesParam ): Promise<{ transactionKey: ?string, proceed: boolean }> => {
  try {
    const r = {
      depositMethod: values.paymentMethod,
      amount: values.amount,
      bonusId: Number(values.bonusId) !== -1 ? Number(values.bonusId) : undefined,
      parameters: values.parameters,
      fee: values.fee != null ? values.fee.asFixed() : undefined,
    };
    const result = await client.execute('deposit', 'POST', r, authentication(req));
    return {
      proceed: true,
      transactionKey: result.transactionKey,
    };
  } catch (e) {
    logger.warn('startDeposit failed!', e);
    return {
      proceed: false,
      transactionKey: undefined,
    };
  }
};

const addDocument = (req: Authentication, type: 'identification' | 'utility_bill' | 'payment_method' | 'other', content: string): Promise<any> => client.execute('documents', 'POST', { type, content }, authentication(req));

const getPromotion = async (promotionId: string, brands: string[], items: number = 1000): Promise<any> => {
  const qs = querystring.stringify({ brands, items });
  const { result } = await client.execute(`promotions/${promotionId}?${qs}`, 'GET');
  return result;
};

const loginWithPhoneNumber = (mobilePhone: string, ipAddress: IPAddress, userAgent: string): Promise<LoginWithPhoneNumberResponse> =>
  client
    .execute('login/mobile', 'POST', {
      mobilePhone,
      ipAddress,
      userAgent,
    })
    .then(result => ({
      SessionKey: result.token,
      player: mapPlayerDetails(result.player),
    }));

const completePlayerRegistration = async (req: Authentication, data: { emailAddress: string, password: string, receivePromotional: LegacyBoolean }): Promise<LegacyPlayer> => {
  const player = await client.execute(
    'players/complete',
    'POST',
    {
      email: data.emailAddress,
      password: data.password,
      allowSMSPromotions: data.receivePromotional === '1' || data.receivePromotional === true,
      allowEmailPromotions: data.receivePromotional === '1' || data.receivePromotional === true,
    },
    authentication(req),
  );
  return mapPlayerDetails(player);
};

const completePartialPlayerRegistration = async (req: Authentication, playerId: string, data: { email: string, mobilePhone: string, allowEmailPromotions: boolean, allowSMSPromotions: boolean }): Promise<LegacyPlayer> => {
  const player = await client.execute(
    `partial/player/${playerId}`,
    'POST',
    {
      email: data.email,
      mobilePhone: data.mobilePhone,
      allowEmailPromotions: data.allowEmailPromotions,
      allowSMSPromotions: data.allowSMSPromotions,
    },
    authentication(req),
  );
  return mapPlayerDetails(player);
};

const getFullDetails = async (req: Authentication): Promise<GetFullDetailsResponse> => {
  const { balance, promotions, player, bonuses } = await client.execute('details/full', 'GET', {}, authentication(req));
  const p = mapPromotions(promotions);
  const b = mapBalance(balance);

  // disabling jefe levels here. all players have level 1 despite how many deposits they have made
  const promo = _.find(p, x => x.Promotion.Name === 'DISABLED_CJ_LOYALTY_POINTS');

  return {
    player: mapPlayerDetails(player),
    bonuses: bonuses.map(bonus => mapBonus(player.currencyId, bonus)),
    balance: { ...b,
      PromotionPlayerStatuses: {
        PromotionPlayerStatus: p,
      },
      CurrentLoyaltyPoints: (promo != null ? promo.Points : undefined) || 0,
      VIPLevel: promo != null ? mapLevel(b, promo) : 1 },
  };
};

const getJackpots = (): Promise<any> => client.execute('getjackpots', 'GET', {});

const getLeaderBoard = (manufacturerId: string, achievement: string): Promise<any> => client.execute(`getleaderboard/${manufacturerId}/${achievement}`, 'GET');

module.exports = {
  mapPlayerDetails,
  mapLegacyPlayer,
  getAccount,
  giveBonus,
  creditBonus,
  getDeposit,
  startDeposit,
  createWageringRequirement,
  removeSelfExclusion,
  getPromotion,
  addDocument,
  getRequiredQuestionnaires,
  answerQuestionnaire,
  topGames,
  addNote,
  updateMobilePhoneStatus,
  updateEmailStatus,
  updateTcVersion,
  requestActivationToken,
  loginWithPhoneNumber,
  completePlayerRegistration,
  completePartialPlayerRegistration,
  getFullDetails,
  getJackpots,
  getLeaderBoard,
  deposits,
  executeDeposit,
  createIdentification,
  accountStatement,
  getTransactions,
  tag,
  startPartialLogin,
  completePartialLogin,
  getPartialLogin,

  PingGetServiceHealth(): Promise<any> {
    return client.execute('status', 'GET', {});
  },

  PlayerValidateEmailExists(
    values: PlayerValidateEmailExistsValuesParam,
  ): Promise<PlayerValidateEmailExistsResponse> {
    return client
      .execute('players', 'GET', { email: values.emailAddress })
      .then((result) => ({ Exists: result.exists ? 'true' : 'false', valid: result.valid }));
  },

  PlayerRegisterAccount(
    values: LegacyPlayerDraft,
    pinCode: string,
  ): Promise<PlayerRegisterAccountResponse> {
    logger.debug('>>>>>> PlayerRegisterAccount', { values, pinCode });
    return api
      .registrationComplete(configuration.shortBrandId(), {
        playerDraft: {
          nationalId: undefined,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.emailAddress,
          address: values.address,
          postCode: values.postCode,
          city: values.city,
          countryId: values.countryId,
          dateOfBirth: values.dateOfBirth,
          mobilePhone: values.mobilePhone,
          languageId: values.languageId.toLowerCase(),
          currencyId: values.currencyId,
          ipAddress: values.ipAddress,
          userAgent: values.userAgent,
          affiliateRegistrationCode: values.affiliateRegistrationCode,
          allowSMSPromotions: ['1', true, 1].includes(values.receivePromotional),
          allowEmailPromotions: ['1', true, 1].includes(values.receivePromotional),
          activated: ['1', true, 1].includes(values.activateAccount),
          tcVersion: values.tcVersion,
          registrationSource: values.registrationSource,
          mobilePhoneStatus: values.mobilePhoneStatus,
          emailStatus: values.emailStatus,
        },
        mobilePhone: values.mobilePhone,
        pinCode,
      })
      .then((result) => {
        const response = {
          IsActivated: result.player.activated ? 'true' : 'false',
          ActivationCode: result.activationCode,
          player: mapPlayerDetails(result.player),
          LoginReturn: { SessionKey: result.token },
        }
        logger.debug('<<<<<< PlayerRegisterAccount', { response });
        return response;
      });
  },

  PlayerUpdateLanguage(values: { languageCode: string, ...APISession }): Promise<any> {
    return client.execute('details', 'POST', {
      sessionKey: values.sessionKey,
      languageId: values.languageCode,
    });
  },

  PlayerUpdateRealityCheck(values: { realityCheckMinutes: number, ...APISession }): Promise<any> {
    return client.execute('details', 'POST', {
      sessionKey: values.sessionKey,
      realityCheckMinutes: values.realityCheckMinutes,
    });
  },

  PlayerUpdateAccountPassword(values: PlayerUpdateAccountValuesParam): Promise<any> {
    return client.execute('password', 'POST', {
      sessionKey: values.sessionKey,
      oldPassword: values.updatePasswordData.OldPassword,
      newPassword: values.updatePasswordData.NewPassword,
    });
  },

  PlayerSetAccountPassword(values: { Password: string, ...APISession }): Promise<any> {
    return client.execute('password/set', 'POST', {
      sessionKey: values.sessionKey,
      newPassword: values.Password,
    });
  },

  PlayerActivateAccount(values: PlayerActivateAccountValuesParam): Promise<any> {
    return client.execute(`activate/${values.activateCode}`, 'POST', {
      ipAddress: values.ipAddress,
    });
  },

  PlayerActivateViaEmailVerification(values: PlayerActivateViaEmailVerificationValuesParam): Promise<any> {
    return client.execute(`activate`, 'POST', {
      ipAddress: values.ipAddress,
      username: values.username,
    });
  },

  PlayerGetDetails(ref: PlayerRef): Promise<LegacyPlayer> {
    return client.execute('details', 'GET', {}, auth(ref)).then(mapPlayerDetails);
  },

  PlayerGetBalance(values: APISession): Promise<any> {
    return Promise.all([
      client.execute('balance', 'GET', values),
      client.execute('promotions', 'GET', values).then(({ result }) => mapPromotions(result)),
    ]).then(([b, promotions]) => {
      const balance = mapBalance(b);
      // disabling jefe levels here. all players have level 1 despite how many deposits they have made
      const promo = _.find(promotions, (x) => x.Promotion.Name === 'DISABLE_CJ_LOYALTY_POINTS');
      const result = {
        ...balance,
        PromotionPlayerStatuses: {
          PromotionPlayerStatus: promotions,
        },
        CurrentLoyaltyPoints: (promo != null ? promo.Points : undefined) || 0,
        VIPLevel: promo != null ? mapLevel(balance, promo) : 0,
      };
      return result;
    });
  },

  PlayerRestrictionSetSelfExlusion(
    values: { isIndefinite: boolean, numMinutes: number, reason: string, ...APISession },
  ): Promise<any> {
    return client.execute('exclusions', 'POST', {
      sessionKey: values.sessionKey,
      permanent: values.isIndefinite,
      days: values.numMinutes / (60 * 24),
      reason: values.reason,
    });
  },

  SessionLoginWithCustomInfo(values: {
    email: string,
    clientPassword: string,
    ipAddress: IPAddress,
    userAgent: string,
  }): Promise<SessionLoginWithCustomInfoResponse> {
    return client
      .execute('login', 'POST', {
        email: values.email.trim(),
        password: values.clientPassword,
        ipAddress: values.ipAddress,
        userAgent: values.userAgent,
      })
      .then((result) => ({
        SessionKey: result.token,
        player: mapPlayerDetails(result.player),
      }));
  },

  SessionCheck(values: APISession): Promise<SessionCheckResponse> {
    return client
      .execute('session', 'GET', values)
      .then(() => ({ IsLoggedIn: 'true' }))
      .catch(() => ({ IsLoggedIn: 'false' }));
  },

  SessionLogout(values: APISession): Promise<any> {
    return client.execute('logout', 'POST', values);
  },

  SessionGetSessionStatistics(values: APISession): Promise<SessionGetSessionStatisticsResponse> {
    return client.execute('session', 'GET', values).then(({ statistics }) => ({
      AmountBet: statistics.amountBet,
      AmoutWin: statistics.amountWin,
      AmountLost: statistics.amountLost,
      PlayTimeMinutes: statistics.playTimeInMinutes,
    }));
  },

  CurrencyGetAll(): Promise<{ CurrencyISO: string, CurrencySymbol: string }[]> {
    return client.execute('currencies', 'GET', {}).then((currencies) =>
      currencies.map((currency) => ({
        CurrencyISO: currency.id,
        CurrencySymbol: currency.symbol,
      })),
    );
  },

  CountriesGetAll(): Promise<
    { Blocked: boolean, Registrations: boolean, CountryISO: string, CountryName: string }[]> {
    return client.execute('countries', 'GET', {}).then((countries) =>
      countries.map((country) => ({
        Blocked: country.blocked,
        Registrations: country.registrationAllowed,
        CountryISO: country.id,
        CountryName: country.name,
      })),
    );
  },

  TransactionGetApplicableDepositBonuses(values: APISession): Promise<any> {
    return client
      .execute('balance', 'GET', values)
      .then((res) => res.bonuses.map((bonus) => mapBonus(res.currencyId, bonus)));
  },

  TransactionGetAllDepositMethods(
    values: APISession,
  ): Promise<TransactionGetAllDepositMethodsResponse> {
    return client.execute('deposit', 'GET', values).then((res) => {
      const depositMethods = [];
      for (const m of Array.from(res.depositMethods)) {
        depositMethods.push({
          PaymentMethod: m.method,
          PlayerLowerLimit: m.lowerLimit,
          PlayerUpperLimit: m.upperLimit,
          accounts: m.accounts,
          providerId: m.providerId,
        });
      }
      return {
        depositMethods,
        accessStatus: mapAccessStatus(res.accessStatus),
        bonuses: res.bonuses,
        limits: res.limits,
      };
    });
  },

  TransactionProceedWithDeposit(values: {
    paymentMethod: string,
    amount: Money,
    bonusRuleID: number,
    fee: ?Money,
    parameters: any,
    ...APISession,
  }): Promise<TransactionProceedWithDepositResponse> {
    return client
      .execute('deposit', 'POST', {
        depositMethod: values.paymentMethod,
        amount: values.amount,
        bonusId: values.bonusRuleID !== -1 ? values.bonusRuleID : undefined,
        sessionKey: values.sessionKey,
        parameters: values.parameters,
        fee: values.fee,
      })
      .then((result) => ({
        CanProceed: 'true',
        TransactionKey: result.transactionKey,
        FailureReason: null,
      }));
  },

  TransactionGetAllWithdrawOptions(values: APISession): Promise<any> {
    return client.execute('withdrawal', 'GET', values).then((wd) => ({
      accounts: wd.accounts.map((account) => ({
        PaymentAccountID: account.id,
        PaymentMethodName: account.method,
        Description: account.account,
        PlayerLowerLimit: account.minWithdrawal,
        PlayerUpperLimit: account.maxWithdrawal,
        KYCChecked: account.kycChecked ? 'true' : 'false',
      })),
      accessStatus: {
        KycRequired: !!wd.accessStatus.depositLimitReached && !wd.accessStatus.verified,
        SowClearanceRequired: !wd.sowClear,
      },
      balance: mapBalance(wd.balance),
      bonuses: wd.bonuses.map((bonus) => ({
        BonusAmountGiven: bonus.initialBalance,
        BonusAmountRemaining: bonus.balance,
        BonusWagerRequirementRemain: bonus.wageringRequirement - bonus.wagered,
        BonusWagerRequirement: bonus.wageringRequirement,
        BonusRuleID: bonus.bonusId,
      })),
      wagering: wd.wagering,
      withdrawalFeeConfiguration: wd.withdrawalFeeConfiguration,
      withdrawalAllowed: wd.withdrawalAllowed,
    }));
  },

  TransactionWithdrawAmount(
    values: { paymentAccountID: string, amount: Money, noFee: boolean, ...APISession },
  ): Promise<any> {
    return client
      .execute('withdrawal', 'POST', {
        sessionKey: values.sessionKey,
        accountId: values.paymentAccountID,
        amount: values.amount,
        noFee: values.noFee,
      })
      .then((result) => ({
        PaymentKey: result.withdrawal.id,
      }));
  },

  TransactionCancelWithdrawal(
    values: { transactionKey: string, reason: string, ...APISession } ,
  ): Promise<any> {
    return client
      .execute(`withdrawal/pending/${values.transactionKey}`, 'DELETE', {
        sessionKey: values.sessionKey,
        reason: values.reason,
      })
      .then((result) => ({
        Transaction: {
          Amount: result.cancelled.amount,
          CurrencyCode: result.balance.currencyId,
          UniqueTransactionID: result.cancelled.transactionKey,
          PaymentKey: result.cancelled.transactionKey,
        },
      }));
  },

  GameGetAllGames(): Promise<Array<any>> {
    return client.execute('game', 'GET', {}).then((games) => games.map(mapGame));
  },

  GameStartGame(values: {
    gameID: string,
    customOptions: ?{ ... },
    requireActivation?: boolean,
    ...APISession,
  }): Promise<GameStartGameResponse> {
    logger.debug('GameStartGame', { values });
    return client
      .execute(`game/${values.gameID}`, 'POST', {
        sessionKey: values.sessionKey,
        parameters: values.customOptions,
        requireActivation: false,
      })
      .then((game) => ({
        GameHTML: game.html,
        GameURL: game.url,
        InitScript: game.script,
      }));
  },

  GameStartGamePlayForFunAsGuest(
    values: GameStartGamePlayForFunAsGuestValuesParam,
  ): Promise<GameStartGamePlayForFunAsGuestResponse> {
    return client
      .execute(`game/${values.gameID}/demo`, 'POST', {
        languageId:
          values.customOptions != null && values.customOptions.LanguageCode != null
            ? values.customOptions.LanguageCode.toLowerCase()
            : undefined,
        currencyId: values.customOptions != null ? values.customOptions.currencyISO : undefined,
        parameters: values.customOptions,
        client: values.client,
      })
      .then((game) => ({
        GameHTML: game.html,
        GameURL: game.url,
        InitScript: game.script,
      }));
  },

  FraudCheck(values: FraudCheckValuesParam): Promise<any> {
    return client.execute('report-fraud', 'POST', {
      username: values.username,
      fraudKey: values.fraudKey,
      fraudId: values.fraudId,
      details: values.details,
    });
  },

  TransactionGetPendingWithdrawalsForPlayer(values: APISession): Promise<any> {
    return client.execute('withdrawal/pending', 'GET', values).then((result) =>
      result.withdrawals.map((wd) => ({
        PaymentMethodName: wd.name,
        UniqueTransactionID: wd.transactionKey,
        CurrencyCode: result.balance.currencyId,
        AccountReference: wd.account,
        CancelWithdrawal: wd.status === 'created' ? 'true' : 'false',
        Amount: wd.amount,
        Fee: wd.paymentFee,
        Timestamp: wd.created,
      })),
    );
  },

  GetPnPDepositInfo(): Promise<any> {
    return client
      .execute('pnpdeposit', 'GET', {})
      .then((res) => res.bonuses.map((bonus) => mapBonus(res.currencyId, bonus)));
  },
};
