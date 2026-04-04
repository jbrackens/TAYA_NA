import { Player } from "./player";
import { AppConfig } from "./config";
import { Jurisdiction } from "./constants";
import { GamesCategory } from "./games";

export interface AppData {
  player: Player;
  requestTc: boolean;
  requiredQuestionnaires: string[];
  mobile: boolean;
  flags: string[];
  config: AppConfig;
  classes: string[];
  search: Search;
  jurisdiction: Jurisdiction;
  categories: GamesCategory[];
  formData: FormData;
}

export interface Search {
  recommendations: string[];
}

export interface Country {
  CurrencyISO: string;
  CountryName: string;
  CountryISO: string;
}

export interface Currency {
  CurrencyISO: string;
  CurrencySymbol: string;
}

export interface PhoneRegion {
  code: string;
  countries: string[];
}

export interface Language {
  path: string;
  code: string;
  longCode: string;
  name: string;
  engName: string;
}

export interface PhoneCountry {
  code: string;
  countries: string[];
}

export interface FormData {
  countries: Country[];
  currencies: Currency[];
  phoneRegions: PhoneRegion[];
  phoneCountry?: PhoneCountry;
  country: Country | null;
  languages: Language[];
}

export interface RealityCheck {
  popupFrequency: number;
  statistics: {
    AmountWin?: string;
    AmountLose?: string;
    PlayTimeMinutes: number;
  };
}

export interface SlideDownData {
  title: string;
  content: string;
}

export interface FooterLink {
  locale: string;
  href: string;
  as: string;
  target?: string;
}

export type Locales = {
  [key: string]: {
    [key: string]: {
      [key: string]: string;
    };
  };
};
