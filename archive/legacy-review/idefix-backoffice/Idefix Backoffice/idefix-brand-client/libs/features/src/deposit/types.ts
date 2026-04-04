export type DepositOptionValues = { [key: string]: boolean };

export type FormValues = {
  amount: string;
  selectedBank: string;
  cardHolderName: string;
  cardExpiryDate: string;
  accountId: string;
  nationalId?: string;
};

export enum DepositTypes {
  EnterCash = "entercash",
  Neteller = "neteller",
  CreditCard = "creditcard",
  Iframe = "iframe",
  Worldpay = "worldpay"
}

export enum DirectaProviders {
  Pix = "Pix",
  Boleto = "Boleto",
  Itau = "Itau",
  PagoEfectivo = "PagoEfectivo",
  BCP = "BCP",
  WebPay = "WebPay",
  MercadoPago = "MercadoPago"
}

export type HostedFieldsCallbackResponse = {
  errors?: {
    creditCard?: string;
    cvv?: string;
  };
  encCvv?: string;
  encCreditcardNumber?: string;
};

export type HostedFields = {
  get(): void;
  setup(config: any): void;
  reset(): void;
};
