/* @flow */

export type PaymentProvider = 'Bambora' | 'SiruMobile' | 'Skrill' | 'Zimpler' | 'Neteller' | 'Mifinity' | 'Trustly' | 'Euteller' | 'MuchBetter' | 'EMP' | 'Kluwp' | 'Interac' | 'BOV' | 'EMP2' | 'Worldpay';
export type GameProvider = 'BFG' | 'BOO' | 'EVO' | 'EYE' | 'HB' | 'LW' | 'MGL' | 'MGM' | 'MGS' | 'NE' | 'NES' | 'ORX' | 'PGM' | 'PNG' | 'PP' | 'RTG' | 'SYN' | 'TK' | 'SGI' | 'YGG' | 'YGM' | 'BFG';
export type SMSProvider = 'Moreify' | 'SmsApiCom';

export type FinnishBank = 'op' | 'nordea' | 'danske' | 'saastopankki' | 'aktia' | 'pop' | 'handelsbanken' | 'spankki' | 'alandsbanken' | 'omasp' | 'siirto';

export type BankInfo = {|
  id: FinnishBank,
  name: string,
  logo: string,
|};

const finnishBanks: $ReadOnlyArray<BankInfo> = [
  {
    id: 'siirto',
    name: 'Siirto',
    logo: 'Siirto.png',
  },
  {
    id: 'op',
    name: 'OP',
    logo: 'Op_logo.png',
  },
  {
    id: 'nordea',
    name: 'Nordea',
    logo: 'Nordea_logo.png',
  },
  {
    id: 'danske',
    name: 'Danske Bank',
    logo: 'Danskebank_logo.png',
  },
  {
    id: 'saastopankki',
    name: 'Säästöpankki',
    logo: 'Saastopankki_logo.png',
  },
  {
    id: 'aktia',
    name: 'Aktia',
    logo: 'Aktia_logo.png',
  },
  {
    id: 'pop',
    name: 'POP Pankki',
    logo: 'Pop_logo.png',
  },
  {
    id: 'handelsbanken',
    name: 'Handelsbanken',
    logo: 'Handelsbanken_logo.png',
  },
  {
    id: 'spankki',
    name: 'S-Pankki',
    logo: 'Spankki_logo.png',
  },
  {
    id: 'alandsbanken',
    name: 'Ålandsbanken',
    logo: 'Alandsbanken_logo.png',
  },
  {
    id: 'omasp',
    name: 'OmaSP',
    logo: 'OmaSP_logo.png',
  },
];

export type BrandInfo = {|
  id: BrandId,
  name: string,
  site: string,
  url: string,
  cdnUrl: string,
|};

const brandDefinitions: { [BrandId]: BrandInfo } = {
  CJ: {
    id: 'CJ',
    name: 'CasinoJEFE',
    site: 'jefe',
    url: 'https://casinojefe.com',
    cdnUrl: 'https://static.casinojefe.com',
  },
  KK: {
    id: 'KK',
    name: 'Kalevala Kasino',
    site: 'kalevala',
    url: 'https://kalevalakasino.com',
    cdnUrl: 'https://static.kalevalakasino.com',
  },
  LD: {
    id: 'LD',
    name: 'LuckyDino',
    site: 'luckydino',
    url: 'https://luckydino.com',
    cdnUrl: 'https://static.luckydino.com',
  },
  OS: {
    id: 'OS',
    name: 'OlaSpill',
    site: 'olaspill',
    url: 'https://olaspill.com',
    cdnUrl: 'https://static.olaspill.com',
  },
};

const brands: $ReadOnlyArray<BrandInfo> = (Object.values(brandDefinitions): any);

const common = {
  realityCheckInMinutes: 60,
};

module.exports = {
  finnishBanks,
  brands,
  brandDefinitions,
  common,
};
