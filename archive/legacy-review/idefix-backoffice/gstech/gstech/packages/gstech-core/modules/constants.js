/* @flow */
export type PaymentProvider =
  | 'Bambora'
  | 'SiruMobile'
  | 'Skrill'
  | 'Zimpler'
  | 'Neteller'
  | 'Mifinity'
  | 'Directa24'
  | 'Trustly'
  | 'Euteller'
  | 'Jeton'
  | 'MuchBetter'
  | 'EMP'
  | 'Kluwp'
  | 'Interac'
  | 'BOV'
  | 'EMP2'
  | 'QPay'
  | 'Worldpay'
  | 'Veriff'
  | 'Neosurf'
  | 'Luqapay'
  | 'Brite'
  | 'Flykk'
  | 'MobulaPay'
  | 'AstroPayCard'
  | 'Pay4Fun'
  | 'ISX';

export type GameProvider =
  | 'BFG'
  | 'BOO'
  | 'ELK'
  | 'EVO'
  | 'EYE'
  | 'HB'
  | 'LW'
  | 'MGL'
  | 'MGM'
  | 'MGS'
  | 'NC'
  | 'NE'
  | 'NES'
  | 'ORX'
  | 'PGM'
  | 'PNG'
  | 'PP'
  | 'RTG'
  | 'SYN'
  | 'TK'
  | 'SGI'
  | 'YGG'
  | 'YGM'
  | 'BBY'
  | 'RLX'
  | 'DS';

export type SMSProvider = 'Moreify' | 'SmsApiCom' | 'Twilio';
export type MailerProvider = 'SendGrid' | 'Nodemailer';
export type SMSAction = 'Login' | 'Campa' ;

export type D24BrazilBank = 'B' | 'CA' | 'SB' | 'UL' | 'BB' | 'BZ' | 'I' | 'SF';
export type D24BrazilVoucher = 'BL' | 'PP' | 'LC';
export type D24PeruBank = 'IB' | 'ST' | 'BC' | 'BAB' | 'RY' | 'BP';
export type D24PeruVoucher =
  | 'YP'
  | 'ME'
  | 'NAG'
  | 'RDP'
  | 'WU'
  | 'KE'
  | 'TM'
  | 'HC'
  | 'US'
  | 'JA'
  | 'JI'
  | 'JP'
  | 'JR'
  | 'JT';
export type D24ChileBank = 'BE' | 'SC' | 'BX' | 'CE' | 'CI' | 'LE' | 'LL';
export type D24ChileVoucher = 'KV' | 'LI' | 'XL' | 'SL' | 'SO';
export type FinnishBank =
  | 'op'
  | 'nordea'
  | 'danske'
  | 'saastopankki'
  | 'aktia'
  | 'pop'
  | 'handelsbanken'
  | 'spankki'
  | 'alandsbanken'
  | 'omasp'
  | 'siirto';

export type BankInfo<T> = { id: T, name: string };

export type BankInfoWithLogo<T> = { ...BankInfo<T>, logo: string };

const d24BrazilBanks: $ReadOnlyArray<BankInfo<D24BrazilBank>> = [
  { id: 'B', name: 'Bradesco' },
  { id: 'CA', name: 'Caixa' },
  { id: 'SB', name: 'Santander' },
  { id: 'UL', name: 'Banrisul' },
  { id: 'BB', name: 'Banco Do Brazil' },
  { id: 'BZ', name: 'Banco Original' },
  { id: 'I', name: 'Itau' },
  { id: 'SF', name: 'Banco Sofra' },
];
const d24BrazilVouchers: $ReadOnlyArray<BankInfo<D24BrazilVoucher>> = [
  { id: 'BL', name: 'Boleto' },
  { id: 'PP', name: 'PicPay' },
  { id: 'LC', name: 'Loterias Caixa' },
];
const d24PeruBanks: $ReadOnlyArray<BankInfo<D24PeruBank>> = [
  { id: 'IB', name: 'Interbank' },
  { id: 'ST', name: 'Scotia' },
  { id: 'BC', name: 'BCP' },
  { id: 'BAB', name: 'Banbif' },
  { id: 'RY', name: 'Banco Ripley' },
  { id: 'BP', name: 'BBVA' },
];
const d24PeruVouchers: $ReadOnlyArray<BankInfo<D24PeruVoucher>> = [
  { id: 'YP', name: 'Yape' },
  { id: 'ME', name: 'Mercadopago' },
  { id: 'NAG', name: 'Niubiz Agents Payment' },
  { id: 'RDP', name: 'Red Digital' },
  { id: 'WU', name: 'Western Union' },
  { id: 'KE', name: 'Kasnet' },
  { id: 'TM', name: 'Tambo' },
  { id: 'HC', name: 'Caja Huancayo' },
  { id: 'US', name: 'Caja Cusco' },
  { id: 'JA', name: 'Caja Arequipa' },
  { id: 'JI', name: 'Caja ICA' },
  { id: 'JP', name: 'Caja Piura' },
  { id: 'JR', name: 'Caja Truijilo' },
  { id: 'JT', name: 'Caja Tacna' },
];
const d24ChileBanks: $ReadOnlyArray<BankInfo<D24ChileBank>> = [
  { id: 'BE', name: 'Banco Estado' },
  { id: 'SC', name: 'Banco Santander' },
  { id: 'BX', name: 'Banco De Chile' },
  { id: 'CE', name: 'Banco BICE' },
  { id: 'CI', name: 'Banco BCI' },
  { id: 'LE', name: 'Banco CrediChile' },
  { id: 'LL', name: 'Banco Falabella' },
];
const d24ChileVouchers: $ReadOnlyArray<BankInfo<D24ChileVoucher>> = [
  { id: 'KV', name: 'Caja Vecina' },
  { id: 'LI', name: 'Lider' },
  { id: 'XL', name: 'Express Lider' },
  { id: 'SL', name: 'Sencillito' },
  { id: 'SO', name: 'Servi Estado' },
];

const finnishBanks: $ReadOnlyArray<BankInfoWithLogo<FinnishBank>> = [
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

export type BrandInfo = {
  id: BrandId,
  name: string,
  site: string,
  url: string,
  cdnUrl: string,
};

const brandDefinitions: { [BrandId]: BrandInfo } = {
  LD: {
    id: 'LD',
    name: 'LuckyDino',
    site: 'luckydino',
    url: 'https://luckydino.com',
    cdnUrl: 'https://static.luckydino.com',
  },
  CJ: {
    id: 'CJ',
    name: 'CasinoJEFE',
    site: 'jefe',
    url: 'https://casinojefe.com',
    cdnUrl: 'https://static.casinojefe.com',
  },
  KK: {
    id: 'KK',
    name: 'JustWOW',
    site: 'kalevala',
    url: 'https://justwow.com',
    cdnUrl: 'https://static.kalevalakasino.com',
  },
  OS: {
    id: 'OS',
    name: 'OlaSpill',
    site: 'olaspill',
    url: 'https://olaspill.com',
    cdnUrl: 'https://static.olaspill.com',
  },
  FK: {
    id: 'FK',
    name: 'HipSpin',
    site: 'fiksu',
    url: 'https://hipspin.com',
    cdnUrl: 'https://static.fiksukasino.com',
  },
  SN: {
    id: 'SN',
    name: 'FreshSpins',
    site: 'sportnation',
    url: 'https://freshspins.com',
    cdnUrl: 'https://static.sportnation.com',
  },
  VB: {
    id: 'VB',
    name: 'VIE',
    site: 'vie',
    url: 'https://vie.bet',
    cdnUrl: 'https://static.vie.bet',
  },
};

const brands: $ReadOnlyArray<BrandInfo> = (Object.values(brandDefinitions): any);

const common = {
  realityCheckInMinutes: 60,
};

module.exports = {
  finnishBanks,
  d24BrazilBanks,
  d24BrazilVouchers,
  d24PeruBanks,
  d24PeruVouchers,
  d24ChileBanks,
  d24ChileVouchers,
  brands,
  brandDefinitions,
  common,
};
