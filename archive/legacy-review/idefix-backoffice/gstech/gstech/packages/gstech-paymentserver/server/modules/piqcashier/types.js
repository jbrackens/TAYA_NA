/* @flow */
import type { DepositRequest } from 'gstech-core/modules/clients/paymentserver-api-types';
import type {
  D24BrazilBank,
  D24BrazilVoucher,
  D24PeruBank,
  D24PeruVoucher,
  D24ChileBank,
  D24ChileVoucher,
} from 'gstech-core/modules/constants';

export type PiqAuthorize = {
  txAmountCy: string,
  attributes: { transactionKey: string, ... },
  userId: string,
};

export type PiqTransfer = {
  txAmountCy: string,
  txAmount: number,
  authCode: string,
  attributes: { transactionKey: string, nationalId: string, ... },
  userId: string,
  pspStatusMessage: string,
  maskedAccount: string,
  accountHolder: string,
  txRefId: string,
  pspRefId: string,
  accountId: string,
  provider: string,
  pspService: string,
  txId: string,
  expiryMonth: string,
  expiryYear: string,
};

export type PiqCancel = {
  userId: string,
  authCode: string,
  attributes: { transactionKey: string, ... },
  pspStatusMessage: string,
  txId: string,
  pspStatusCode: string,
};

type CashierTheme = {
  input: {
    color: string,
    fontSize: string,
    height: string,
    borderRadius: string,
  },
  inputbackgroud: {
    color: string,
  },
  labels: {
    color: string,
    fontSize: string,
  },
  headings: {
    color: string,
    fontSize: string,
  },
  loader: { color: string },
  error: { color: string },
  buttons: { color: string },
  headerbackground: { color: string },
  background: { color: string },
  cashierbackground: { color: string },
  border: { radius: string },
  margin: { size: string },
  cardbackground: { color: string },
  creditcardicons: {
    creditcardUrl: 'default' | string,
    cvvUrl: 'default' | string,
    expirydateUrl: 'default' | string,
  },
};

export type CashierConfigBase = {
  fetchConfig: boolean,
  fixedProviderType: boolean,
  autoProcess: boolean,
  blockBrowserNavigation: boolean,
  containerHeight: '750px' | '850px',
  containerWidth: '450px',
  accountDelete: boolean,
  alwaysShowSubmitBtn: boolean,
  country: string,
  displayLogoOrName: 'logo' | 'name' | 'both',
  globalSubmit: boolean,
  history: boolean,
  hideTxOverview: boolean,
  errorMsgTxRefId: boolean,
  showFee: boolean,
  showReceipt: boolean | string,
  layout: 'horizontal' | 'vertical',
  listType: 'list' | 'grid',
  locale: string,
  logoUrl?: string,
  pmListLimit: string,
  predefinedAmounts: string,
  showAccounts: boolean | string,
  accountId: ?string,
  showFooter: boolean,
  showAmount: boolean,
  showTransactionOverview: boolean,
  storeAccount: boolean,
  predefinedValues: boolean,
  showAmountLimits: boolean,
  singlePageFlow: boolean,
  allowMobilePopup: boolean,
  receiptBackBtn: boolean,
  newPaymentBtn: boolean,
  theme: Partial<{ [key in keyof CashierTheme]: Partial<CashierTheme[key]> }>,
};

type CashierAttributesBase = {
  transactionKey: string,
  successUrl: string,
  pendingUrl: string,
  failureUrl: string,
  cancelUrl: string,
};

export type FlykkConfigPmInfo = {
  providerType: 'FLYKK',
  autoProcess: true,
  attributes: {
    service: 'Flykk',
  },
};

export type InteracConfigPmInfo = {
  providerType: 'INTERAC_ONLINE' | 'INTERAC_ETRANSFER',
  autoProcess: true,
  attributes: {
    service: 'InteracOnline' | 'InteracETransfer',
  },
};

type KluwpConfigPmInfo = {
  providerType: 'KLUWP',
  autoProcess: true,
  attributes: {
    service: 'Kluwp',
  },
};

export type D24DirectService = 'IX' | 'WP' | 'EF' | 'VI' | 'MC' | 'XA' | 'BL' | 'I' | 'BC' | 'ME';

export type Directa24ServiceCode =
  | D24DirectService
  | D24BrazilBank
  | D24BrazilVoucher
  | D24PeruBank
  | D24PeruVoucher
  | D24ChileBank
  | D24ChileVoucher;

export type Directa24ConfigPmInfoBase = {
  providerType: 'D24',
  attributes: {
    nationalId?: string,
    service: Directa24ServiceCode,
  },
};

export type Directa24ConfigPmInfoAuto = {
  ...Directa24ConfigPmInfoBase,
  autoProcess: true,
  user: {
    nationalId: string,
  },
};

export type Directa24ConfigPmInfo = Directa24ConfigPmInfoBase | Directa24ConfigPmInfoAuto;

type NewBamboraCardConfigPmInfo = {
  providerType: 'CREDITCARD',
  showAccounts: false,
  storeAccount: true,
  attributes: {
    cardHolder: string,
    service: 'Bambora',
  },
};

type ExistingBamboraCardConfigPmInfo = {
  providerType: 'CREDITCARD',
  accountId: string,
  showAccounts: 'inline',
  storeAccount: true,
  attributes: {
    prefilledCard: true,
    service: 'Bambora',
  },
};

type NewMobulaPayCardConfigPmInfo = {
  providerType: 'CREDITCARD-IKAJO',
  showAccounts: false,
  storeAccount: true,
  attributes: {
    cardHolder: string,
    service: 'MobulaPay',
  },
};

type ExistingMobulaPayCardConfigPmInfo = {
  providerType: 'CREDITCARD-IKAJO',
  accountId: string,
  showAccounts: 'inline',
  storeAccount: true,
  attributes: {
    prefilledCard: true,
    service: 'MobulaPay',
  },
};

type MobulaPayCardConfigPmInfo = NewMobulaPayCardConfigPmInfo | ExistingMobulaPayCardConfigPmInfo;
type BamboraCardConfigPmInfo = NewBamboraCardConfigPmInfo | ExistingBamboraCardConfigPmInfo;

export type CreditCardConfigPmInfo = MobulaPayCardConfigPmInfo | BamboraCardConfigPmInfo;

type AstropayCardConfigPmInfo = {
  providerType: 'ASTROPAYCARD',
  autoProcess: true,
  attributes: {
    service: 'AstroPayCard',
  },
};

type Pay4FunConfigPmInfo = {
  providerType: 'PAY4FUN',
  autoProcess?: true,
  user: {
    email: string,
  },
  attributes: {
    service: 'Pay4Fun',
  },
};

type CashierConfigPmAttributes = $PropertyType<
  Directa24ConfigPmInfo | CreditCardConfigPmInfo,
  'attributes',
>;

type CashierAttributes = {
  ...CashierAttributesBase,
  ...?$Exact<CashierConfigPmAttributes>,
};

export type CashierConfigPmInfo =
  | InteracConfigPmInfo
  | Directa24ConfigPmInfo
  | KluwpConfigPmInfo
  | FlykkConfigPmInfo
  | MobulaPayCardConfigPmInfo
  | BamboraCardConfigPmInfo
  | AstropayCardConfigPmInfo
  | Pay4FunConfigPmInfo;

export type CashierConfigPmInfoFn = (DepositRequest) =>
  | Promise<CashierConfigPmInfo>
  | CashierConfigPmInfo;

export type CashierConfigTxInfo = {
  method: 'deposit',
  environment: 'production' | 'test',
  userId: string,
  merchantId: string,
  sessionId: string,
  country: string,
  locale: string,
  amount: number,
  attributes: CashierAttributes,
  user?: { [string]: mixed },
};

export type CashierConfig = {
  ...CashierConfigBase,
  ...CashierConfigTxInfo,
  ...CashierConfigPmInfo,
};
