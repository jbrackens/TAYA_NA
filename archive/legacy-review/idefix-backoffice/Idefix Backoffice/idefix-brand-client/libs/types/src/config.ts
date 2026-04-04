import { LiveAgent } from "./live-agent";

export interface AppConfig {
  liveagent?: LiveAgent;
  ws?: {
    url: string;
  };
  paymentiq?: {
    merchantId: string;
    apiUrl: string;
    frameUrl: string;
  };
}

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

export interface CMSDataLanguage {
  path: string;
  code: string;
  longCode: string;
  name: string;
  engName: string;
}

export interface CmsPageOptions {
  httpStatus?: number;
  login?: boolean;
  mobile: boolean;
  body: string;
  head: string;
  location?: string;
  options: {
    id: string;
    location: string;
    type: string;
    bonus?: string;
  };
  formData?: {
    country: {
      CountryISO: string;
      CountryName: string;
      CurrencyISO: string;
      code: string;
    };
    countries: {
      CountryISO: string;
      CountryName: string;
      CurrencyISO: string;
    }[];
    currencies: {
      CurrencyISO: string;
      CurrencySymbol: string;
    }[];
    languages: CMSDataLanguage[];
    phoneCountry?: {
      code: string;
    };
    phoneRegions: {
      code: string;
    }[];
  };
  config?: {
    CDN: string;
    CDNv: string;
    clientConfig: {
      gaAccount: string;
      gaDomain: string;
      liveChat: boolean;
    };
    currencyISO: string;
    isMobile: boolean;
    lang: LanguageObject;
    liveChatToken: string;
    liveagent: LiveAgent;
    siteName: string;
    showPhoneLogin: boolean;
    showLogin: boolean;
  };
  headerTags?: {
    tag: string;
    text?: string;
    attr?: {
      name?: string;
      text?: string;
      rel?: string;
      href?: string;
      sizes?: string;
    };
  }[];
}
