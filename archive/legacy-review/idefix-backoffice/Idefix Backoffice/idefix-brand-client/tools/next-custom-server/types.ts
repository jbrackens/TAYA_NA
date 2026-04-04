export interface LanguageObject {
  code: string;
  engName: string;
  longCode: string;
  name: string;
}

export interface Config {
  cdn: string;
  thumbsCdn: string;
  bonusThumbsCdn: string;
  css: string;
  scripts: string[];
  languages: LanguageObject[];
}

export type Locales = {
  [key: string]: {
    [key: string]: {
      [key: string]: string;
    };
  };
};

export type CurrencyISO = "EUR" | "SEK" | "NOK" | "CAD" | "USD" | "GBP" | "INR";

export interface Profile {
  FirstName: string;
  Address1: string;
  LastName: string;
  EmailAddress: string;
  PostCode: string;
  City: string;
  LanguageISO: string;
  MobilePhone: string;
  CountryISO: string;
  CurrencyISO: CurrencyISO;
  Country: {
    CountryID: string;
    CountryISO: string;
    CountryName: string;
    CurrencyISO: CurrencyISO;
  };
  Pnp: boolean;
}

export interface Intl {
  locale: string;
  messages: { [key: string]: string };
}

declare global {
  namespace Express {
    interface Request {
      config: Config;
      locales?: Locales;
      profile?: Profile;
      intl?: Intl;
    }
  }
}
