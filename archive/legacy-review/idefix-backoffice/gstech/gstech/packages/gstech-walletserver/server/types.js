/* @flow */
import type {
  GetJackpotsRequest,
  CreditFreeSpinsRequest,
  CreateFreeSpinsRequest,
  CreateFreeSpinsResponse,
  CreditFreeSpinsResponse,
  DemoGameLaunchInfo,
  LaunchDemoGameRequest,
  RealGameLaunchInfo,
  LaunchGameRequest,
  GetLeaderBoardResponse,
  GetJackpotsResponse,
} from 'gstech-core/modules/clients/walletserver-api-types';

import type { Config } from 'gstech-core/modules/types/config';
import type { GameProvider } from 'gstech-core/modules/constants';

export type GameProviderApi = {
  launchGame: (launchGameRequest: LaunchGameRequest) => Promise<RealGameLaunchInfo>,
  launchDemoGame: (
    brandId: BrandId,
    launchDemoGameRequest: LaunchDemoGameRequest,
  ) => Promise<DemoGameLaunchInfo>,
  creditFreeSpins?: (
    brandId: BrandId,
    creditFreeSpinsRequest: CreditFreeSpinsRequest,
  ) => Promise<CreditFreeSpinsResponse>,
  createFreeSpins?: (
    createFreeSpinsRequest: CreateFreeSpinsRequest,
  ) => Promise<CreateFreeSpinsResponse>,
  getJackpots?: (
    brandId: BrandId,
    getJackpotsRequest: GetJackpotsRequest,
  ) => Promise<GetJackpotsResponse>,
  getLeaderBoard?: (brandId: BrandId, achievement: string) => Promise<GetLeaderBoardResponse>,
  ping?: (brandId: BrandId) => Promise<OkResult>,
};

export type ExtendedConfig<T = any> = {
  disabled?: boolean,
  ...T,
};

export type GameServerModule = {
  api: GameProviderApi,
  router?: express$Router<>,
  configuration: ExtendedConfig<>,
};

export type BFGamesConfig = {
  api: {
    host: string,
    key: string,
    offlineToken: string,
  },
  username: string,
  password: string,
};

export type BoomingConfig = {
  api: {
    url: string,
    brands: {
      [brandId: BrandId]: {
        key: string,
        secret: string,
      },
    },
    germanBrands: {
      [brandId: BrandId]: ?{
        key: string,
        secret: string,
      },
    },
  },
  callbackUrl: string,
  rollback_callback: string,
};

export type ELKConfig = {
  gameServer: string,
  operatorId: string,
  partnerId: string,
  password: string,
};

export type EvolutionConfig = {
  hostname: string,
  casino: {
    key: string,
  },
  api: {
    token: string,
    password: string,
  },
  authToken: string,
};

export type EyeconConfig = {
  apiServer: string,
  gameServer: string,
  accessid: string,
};

export type HabaneroConfig = {
  brandId: string,
  apiKey: string,
  username: string,
  passkey: string,
  gameLaunchUrl: string,
};

export type LottoWarehouseConfig = {
  gameServer: string,
};

export type NolimitCityConfig = {
  gameServer: string,
  apiServer: string,
  key: string,
};

export type MicrogamingConfig = {
  launchUrl: string,
  mobileLaunchUrl: string,
  apiUrl: string,
  jackpotsUrl: string,
  demoServerId: string,
  variant: string,
  demoVariant: string,
  manufacturerId: GameProvider,
  brands: {
    [brandId: BrandId]: {
      serverId: string,
      lobbyName: string,
      login: string,
      password: string,
      orionLogin: string,
      orionPassword: string,
      applicationid: string,
      lobbyUrl?: string,
      bankingUrl?: string,
    },
  },
};

export type NetentConfig = {
  countryId: ?Array<string>,
  manufacturerId: GameProvider,
  endpoint: string,
  staticServer: string,
  gameServer: string,
  liveCasinoHost: string,
  gameinclusion: string,
  defaultBrand: BrandId,
  callerId: string,
  callerPassword: string,
  pooledJackpots: Array<string>,
  brands: {
    [brandId: BrandId]: {
      merchantId: string,
      merchantPassword: string,
      lobbyUrl: string,
      config?: {
        enableDefaultSwedenButtons: boolean,
        pluginUrl: string,
      },
    },
  },
  playerIdMapping: {
    [brandId: BrandId]: number,
  },
  legacyIdFormat: boolean,
};

export type OryxConfig = {
  walletCodes: {
    [brandId: BrandId]: string,
  },
  germanWalletCodes: {
    [brandId: BrandId]: ?string,
  },
  gameServer: {
    server: string,
    auth: {
      username: string,
      password: string,
    },
  },
  apiServer: string,
  api: {
    walletCode: string,
    auth: {
      username: string,
      password: string,
    },
  }[],
};

export type PlayngoEnvironment = {
  pid: number,
  mobileLaunch: string,
  desktopLaunch: string,
  accessToken: string,
  manufacturerId: GameProvider,
  api: {
    endpoint: string,
    auth: {
      user: string,
      password: string,
      ...
    },
    ...
  },
};

export type PlayngoConfig = {
  environments: Array<PlayngoEnvironment>,
  brands: {
    [brandId: BrandId]: {
      lobbyUrl: string,
    },
  },
};

export type PragmaticConfig = {
  apiServer: string,
  gameServer: string,
  brands: {
    [brandId: BrandId]: {
      secureLogin: string,
      secretKey: string,
      providerId: string,
      demoLaunchUrl: string,
    },
  },
  germanBrands: {
    [brandId: BrandId]: ?{
      secureLogin: string,
      secretKey: string,
      providerId: string,
      demoLaunchUrl: string,
    },
  },
};

export type RedTigerConfig = {
  apiServer: string,
  gameServer: string,
  apiKey: string,
  reconToken: string,
  bonusApi: {
    key: string,
    secret: string,
  },
};

export type SynotConfig = {
  api: {
    server: string,
    pff_server: string,
    customer: string,
    secretKey: string,
  },
};

export type ThunderkickConfig = {
  apiServer: string,
  gameServer: string,
  apiServerUser: string,
  apiServerPass: string,
  user: string,
  pass: string,
  providerId: string,
  lobbyUrl: string,
  operatorId: number,
  jurisdiction: string,
};

export type WilliamsConfig = {
  flashUrl: string,
  mobileUrl: string,
  brands: {
    [brandId: BrandId]: {
      lobbyUrl: string,
      partnerCode: string,
    },
  },
};

export type YggdrasilConfig = {
  environments: Array<{
    demoLaunchUrl: string,
    launchUrl: string,
    manufacturerId: GameProvider,
    jackpotsUrl: string,
  }>,
  brands: {
    [brandId: BrandId]: {
      org: string,
    },
  },
};

export type BetbyConfig = {
  rendererLib: string,
  operatorID: string,
  api: {
    host: string,
    pubKey: string,
    prvKey: string,
  },
  brands: {
    [brandId: BrandId]: {
      brandId: string,
      themeName: string,
      pubKey: string,
      bonusTemplateId: string,
      freeBet: {
        maxAmount: {
          EUR: number,
          INR: number,
          NOK: number,
          SEK: number,
          GBP: number,
          USD: number,
          CAD: number,
          NZD: number,
          BRL: number,
          CLP: number,
          PEN: number,
        },
      },
    },
  },
};

export type RelaxConfig = {
  api: {
    gameLauncherUri: string,
    partnerApi: string,
    partnerApiAuth: {
      user: string,
      pass: string,
    },
    partnerId: number,
  },
};

export type EvoOSSConfig = {
  hostname: string,
  casino: {
    key: string,
  },
  api: {
    token: string,
  },
  jackpotApi: {
    token: string,
  },
  authToken: string,
};

export type DelasportConfig = {
  sharedSecret: string,
  iframeUrl: string,
  apiUrl: string,
  apiKey: string,
  apiAccess: string,
};

export type GameProvidersConfiguration = {
  providers: {
    bfgames: ExtendedConfig<BFGamesConfig>,
    booming: ExtendedConfig<BoomingConfig>,
    elk: ExtendedConfig<ELKConfig>,
    evolution: ExtendedConfig<EvolutionConfig>,
    eyecon: ExtendedConfig<EyeconConfig>,
    habanero: ExtendedConfig<HabaneroConfig>,
    lottowarehouse: ExtendedConfig<LottoWarehouseConfig>,
    nolimitcity: ExtendedConfig<NolimitCityConfig>,
    microgaming: ExtendedConfig<MicrogamingConfig>[],
    netent: ExtendedConfig<NetentConfig>[],
    oryx: ExtendedConfig<OryxConfig>,
    playngo: ExtendedConfig<PlayngoConfig>,
    pragmatic: ExtendedConfig<PragmaticConfig>,
    redtiger: ExtendedConfig<RedTigerConfig>,
    synot: ExtendedConfig<SynotConfig>,
    thunderkick: ExtendedConfig<ThunderkickConfig>,
    williams: ExtendedConfig<WilliamsConfig>,
    yggdrasil: ExtendedConfig<YggdrasilConfig>,
    betby: ExtendedConfig<BetbyConfig>,
    evoOSS: ExtendedConfig<EvoOSSConfig>,
    relax: ExtendedConfig<RelaxConfig>,
    delasport: ExtendedConfig<DelasportConfig>,
  },
};

export type WalletServerConfig = {
  backend: { lottoBackend: string },
  enableEvolutionEvents: boolean,
  ...GameProvidersConfiguration,
  ...Config,
};
