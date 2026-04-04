/* @flow */
import type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
  RegisterRequest,
  RegisterResponse,
  IdentifyRequest,
  IdentifyResponse,
  LoginRequest,
  LoginResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { Config } from 'gstech-core/modules/types/config';

export type PaymentProviderApi = Partial<{
  deposit: (request: DepositRequest) => Promise<DepositResponse>,
  withdraw: (request: WithdrawRequest) => Promise<WithdrawResponse>,
  identify: (request: IdentifyRequest) => Promise<IdentifyResponse>,
  register: (request: RegisterRequest) => Promise<RegisterResponse>,
  login: (request: LoginRequest) => Promise<LoginResponse>,
}>;

export type PaymentServerModule = {
  api: PaymentProviderApi,
  router: express$Router<>,
};

export type PaymentiqConfig ={
  merchantId: string,
  apiUrl: string,
};

export type ZimplerConfig ={
  merchantId: string,
  apiKey: string,
  apiUrl: string,
  scriptLocation: string,
  url: string,
};

export type SkrillConfig = {
  gatewayURL: string,
  paymentGatewayURL: string,
  apiURL: string,
  merchantId: string,
  account: string,
  secret: string,
  password: string,
};

export type SiruConfig = {
  site: string,
  endpoint: string,
  countries: {
    FI: { secret: string, merchantId: number },
    SE: { secret: string, merchantId: number },
    NO: { secret: string, merchantId: number },
  },
};

export type NetellerConfig ={
  endpoint: string,
  clientId: string,
  clientSecret: string,
};

export type TrustlyConfig = {
  accounts: {
    standard: {
      username: string,
      password: string,
    },
    pnp: {
      username: string,
      password: string,
    },
    bank: {
      username: string,
      password: string,
    },
  },
  brandsAccounts: {
    [BrandId]: string,
  },
  privateKey: string,
};

export type EutellerConfig = {
  identifyApi: string,
  paymentApi: string,
  deposit: {
    username: string,
    password: string,
  },
  withdraw: {
    username: string,
    password: string,
  },
  merchant: {
    username: string,
    password: string,
  },
};

export type EMPConfig = {
  apiUrl: string,
  apiKey: string,
};

export type JetonConfig = {
  endpoint: string,
  brands: {
    [brandId: BrandId]: {
      apiKey: string,
    }
  }
};

export type MuchBetterConfig = {
  walletHost: string,
  walletPort: number,
  authorizationToken: string,
  merchantAccountId: string,
  signupLink: string,
};

export type WorldPayConfig = {
  merchantCode: string,
  username: string,
  password: string,
  secret: string,
  url: string,
  installationId: string,
  withdraw: {
    merchantCode: string,
    username: string,
    password: string,
  },
};

export type QPayConfig = {
  url: string,
  meId: string,
  agId: string,
  distributorId: string,
  aesKey: string,
  defaultAesKey: string,
  aesIV: string,
  withdrawals: {
    url: string,
  }
};

export type NeosurfConfig = {
  apiUrl: string,
  merchantId: string,
  secret: string,
};

export type LuqapayConfig = {
  [brandId: BrandId]: {
    apiUrl: string,
    apiKey: string,
    secret: string,
  },
};

export type BriteConfig = {
  [brandId: BrandId]: {
    apiUrl: string,
    merchantId: string,
    publicKey: string,
    secret: string,
  },
};

export type ISignThisConfig = {
  merchantId: string,
  senderIban: string,
  apiUrl: string,
  domain: string,
  subdomain: string,
  privateKey: string,
  publicKey: string,
  hmacSecret: string,
}

export type PaymentProvidersConfiguration = {
  providers: {
    paymentiq: {
      password: string,
      brands: {
        [brandId: BrandId]: PaymentiqConfig,
      },
    },
    zimpler: {
      brands: {
        [brandId: BrandId]: ZimplerConfig,
      },
    },
    skrill: SkrillConfig,
    siru: {
      brands: {
        [brandId: BrandId]: SiruConfig,
      },
    },
    neteller: {
      paysafe: NetellerConfig,
      neteller: NetellerConfig,
    },
    trustly: TrustlyConfig,
    euteller: EutellerConfig,
    emp: EMPConfig,
    jeton: JetonConfig,
    muchbetter: MuchBetterConfig,
    worldpay: WorldPayConfig,
    qpay: QPayConfig,
    veriff: {
      apiUrl: string,
      apiToken: string,
      apiSecret: string,
    },
    neosurf: NeosurfConfig,
    luqapay: LuqapayConfig,
    brite: BriteConfig,
    isignthis: ISignThisConfig
  },
};

export type PaymentServerConfig = {
  server: {
    public: string,
    private: string,
  },
  ...PaymentProvidersConfiguration,
  ...Config,
};
