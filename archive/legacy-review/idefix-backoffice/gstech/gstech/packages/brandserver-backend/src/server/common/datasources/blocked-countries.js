// @flow

export type BlockedCountryCodes = {
  country: string,
  blocked: boolean,
  prefix: number,
}[];

const blockedCountries: BlockedCountryCodes = [
  {
    country: 'Sweden',
    blocked: true,
    prefix: 46,
  },
  {
    country: 'United Kingdom',
    blocked: true,
    prefix: 44,
  },
  {
    country: 'Denmark',
    blocked: true,
    prefix: 45,
  },
  {
    country: 'Ireland',
    blocked: true,
    prefix: 353,
  },
  {
    country: 'Belgium',
    blocked: true,
    prefix: 32,
  },
  {
    country: 'Poland',
    blocked: true,
    prefix: 48,
  },
  {
    country: 'Czech Republic',
    blocked: true,
    prefix: 420,
  },
  {
    country: 'Uzbekistan',
    blocked: true,
    prefix: 998,
  },
  {
    country: 'East Timor',
    blocked: true,
    prefix: 670,
  },
  {
    country: 'Central Texas',
    blocked: true,
    prefix: 512,
  },
  {
    country: 'Kazakhstan',
    blocked: true,
    prefix: 7,
  },
  {
    country: 'Russia',
    blocked: true,
    prefix: 7,
  },
  {
    country: 'Egypt',
    blocked: true,
    prefix: 20,
  },
  {
    country: 'Greece',
    blocked: true,
    prefix: 30,
  },
  {
    country: 'Hungary',
    blocked: true,
    prefix: 36,
  },
  {
    country: 'Romania',
    blocked: true,
    prefix: 40,
  },
  {
    country: 'Switzerland',
    blocked: true,
    prefix: 41,
  },
  {
    country: 'Austria',
    blocked: true,
    prefix: 43,
  },
  {
    country: 'Cuba',
    blocked: true,
    prefix: 53,
  },
  {
    country: 'Argentina',
    blocked: true,
    prefix: 54,
  },
  {
    country: 'Venezuela',
    blocked: true,
    prefix: 58,
  },
  {
    country: 'Philippines',
    blocked: true,
    prefix: 63,
  },
  {
    country: 'Singapore',
    blocked: true,
    prefix: 65,
  },
  {
    country: 'South Korea',
    blocked: true,
    prefix: 82,
  },
  {
    country: 'Vietnam',
    blocked: true,
    prefix: 84,
  },
  {
    country: 'China',
    blocked: true,
    prefix: 86,
  },
  {
    country: 'Turkey',
    blocked: true,
    prefix: 90,
  },
  {
    country: 'Pakistan',
    blocked: true,
    prefix: 92,
  },
  {
    country: 'Afghanistan',
    blocked: true,
    prefix: 93,
  },
  {
    country: 'Sri Lanka',
    blocked: true,
    prefix: 94,
  },
  {
    country: 'Myanmar',
    blocked: true,
    prefix: 95,
  },
  {
    country: 'Iran',
    blocked: true,
    prefix: 98,
  },
  {
    country: 'South Sudan',
    blocked: true,
    prefix: 211,
  },
  {
    country: 'Morocco',
    blocked: true,
    prefix: 212,
  },
  {
    country: 'Algeria',
    blocked: true,
    prefix: 213,
  },
  {
    country: 'Libya',
    blocked: true,
    prefix: 218,
  },
  {
    country: 'Senegal',
    blocked: true,
    prefix: 221,
  },
  {
    country: 'Mali',
    blocked: true,
    prefix: 223,
  },
  {
    country: 'Ivory Coast',
    blocked: true,
    prefix: 225,
  },
  {
    country: 'Burkina Faso',
    blocked: true,
    prefix: 226,
  },
  {
    country: 'Liberia',
    blocked: true,
    prefix: 231,
  },
  {
    country: 'Nigeria',
    blocked: true,
    prefix: 234,
  },
  {
    country: 'Republic of the Congo',
    blocked: true,
    prefix: 242,
  },
  {
    country: 'Democratic Republic of the Congo',
    blocked: true,
    prefix: 243,
  },
  {
    country: 'Guinea-Bissau',
    blocked: true,
    prefix: 245,
  },
  {
    country: 'British Indian Ocean Territory',
    blocked: true,
    prefix: 246,
  },
  {
    country: 'Sudan',
    blocked: true,
    prefix: 249,
  },
  {
    country: 'Rwanda',
    blocked: true,
    prefix: 250,
  },
  {
    country: 'Somalia',
    blocked: true,
    prefix: 252,
  },
  {
    country: 'Kenya',
    blocked: true,
    prefix: 254,
  },
  {
    country: 'Tanzania',
    blocked: true,
    prefix: 255,
  },
  {
    country: 'Uganda',
    blocked: true,
    prefix: 256,
  },
  {
    country: 'Mozambique',
    blocked: true,
    prefix: 258,
  },
  {
    country: 'Réunion',
    blocked: true,
    prefix: 262,
  },
  {
    country: 'Zimbabwe',
    blocked: true,
    prefix: 263,
  },
  {
    country: 'Eritrea',
    blocked: true,
    prefix: 291,
  },
  {
    country: 'Albania',
    blocked: true,
    prefix: 355,
  },
  {
    country: 'Cyprus',
    blocked: true,
    prefix: 357,
  },
  {
    country: 'Bulgaria',
    blocked: true,
    prefix: 359,
  },
  {
    country: 'Lithuania',
    blocked: true,
    prefix: 370,
  },
  {
    country: 'Ukraine',
    blocked: true,
    prefix: 380,
  },
  {
    country: 'Croatia',
    blocked: true,
    prefix: 385,
  },
  {
    country: 'Slovenia',
    blocked: true,
    prefix: 386,
  },
  {
    country: 'Bosnia and Herzegovina',
    blocked: true,
    prefix: 387,
  },
  {
    country: 'Slovakia',
    blocked: true,
    prefix: 421,
  },
  {
    country: 'Nicaragua',
    blocked: true,
    prefix: 505,
  },
  {
    country: 'Panama',
    blocked: true,
    prefix: 507,
  },
  {
    country: 'Haiti',
    blocked: true,
    prefix: 509,
  },
  {
    country: 'Guadeloupe',
    blocked: true,
    prefix: 590,
  },
  {
    country: 'Guyana',
    blocked: true,
    prefix: 592,
  },
  {
    country: 'Martinique',
    blocked: true,
    prefix: 596,
  },
  {
    country: 'Papua New Guinea',
    blocked: true,
    prefix: 675,
  },
  {
    country: 'Vanuatu',
    blocked: true,
    prefix: 678,
  },
  {
    country: 'Fiji',
    blocked: true,
    prefix: 679,
  },
  {
    country: 'Samoa',
    blocked: true,
    prefix: 685,
  },
  {
    country: 'North Korea',
    blocked: true,
    prefix: 850,
  },
  {
    country: 'Hong Kong',
    blocked: true,
    prefix: 852,
  },
  {
    country: 'Macau',
    blocked: true,
    prefix: 853,
  },
  {
    country: 'Cambodia',
    blocked: true,
    prefix: 855,
  },
  {
    country: 'Laos',
    blocked: true,
    prefix: 856,
  },
  {
    country: 'Bangladesh',
    blocked: true,
    prefix: 880,
  },
  {
    country: 'Lebanon',
    blocked: true,
    prefix: 961,
  },
  {
    country: 'Jordan',
    blocked: true,
    prefix: 962,
  },
  {
    country: 'Syria',
    blocked: true,
    prefix: 963,
  },
  {
    country: 'Iraq',
    blocked: true,
    prefix: 964,
  },
  {
    country: 'Kuwait',
    blocked: true,
    prefix: 965,
  },
  {
    country: 'Saudi Arabia',
    blocked: true,
    prefix: 966,
  },
  {
    country: 'Yemen',
    blocked: true,
    prefix: 967,
  },
  {
    country: 'Palestine',
    blocked: true,
    prefix: 970,
  },
  {
    country: 'Israel',
    blocked: true,
    prefix: 972,
  },
  {
    country: 'Bahrain',
    blocked: true,
    prefix: 973,
  },
  {
    country: 'Qatar',
    blocked: true,
    prefix: 974,
  },
  {
    country: 'Georgia',
    blocked: true,
    prefix: 995,
  },
  {
    country: 'Kyrgyzstan',
    blocked: true,
    prefix: 996,
  },
  {
    country: 'Bahamas',
    blocked: true,
    prefix: 1242,
  },
  {
    country: 'Barbados',
    blocked: true,
    prefix: 1246,
  },
  {
    country: 'Cayman Islands',
    blocked: true,
    prefix: 1345,
  },
  {
    country: 'Northern Mariana Islands',
    blocked: true,
    prefix: 1670,
  },
  {
    country: 'Guam',
    blocked: true,
    prefix: 1671,
  },
  {
    country: 'American Samoa',
    blocked: true,
    prefix: 1684,
  },
  {
    country: 'Puerto Rico',
    blocked: true,
    prefix: 1787,
  },
  {
    country: 'Puerto Rico',
    blocked: true,
    prefix: 1939,
  },
  {
    country: 'Jamaica',
    blocked: true,
    prefix: 1876,
  },
  {
    country: 'Jersey',
    blocked: true,
    prefix: 441534,
  },
  {
    country: 'Indonesia',
    blocked: true,
    prefix: 62,
  },
  {
    country: 'Malaysia',
    blocked: true,
    prefix: 60,
  },
  {
    country: 'Azerbaijan',
    blocked: true,
    prefix: 994,
  },
  {
    country: 'Tajikistan',
    blocked: true,
    prefix: 992,
  },
  {
    country: 'Oman',
    blocked: true,
    prefix: 968,
  },
  {
    country: 'Gabon',
    blocked: true,
    prefix: 241,
  },
  {
    country: 'Chad',
    blocked: true,
    prefix: 235,
  },
  {
    country: 'Nepal',
    blocked: true,
    prefix: 977,
  },
  {
    country: 'Ghana',
    blocked: true,
    prefix: 233,
  },
  {
    country: 'Cameroon',
    blocked: true,
    prefix: 237,
  },
  {
    country: 'Mongolia',
    blocked: true,
    prefix: 976,
  },
  {
    country: 'Zambia',
    blocked: true,
    prefix: 260,
  },
  {
    country: 'Bhutan',
    blocked: true,
    prefix: 975,
  },
  {
    country: 'India',
    blocked: true,
    prefix: 91,
  },
  {
    country: 'Angola',
    blocked: true,
    prefix: 244,
  },
  {
    country: 'Guinea',
    blocked: true,
    prefix: 224,
  },
  {
    country: 'Bolivia',
    blocked: true,
    prefix: 591,
  },
  {
    country: 'Malawi',
    blocked: true,
    prefix: 265,
  },
  {
    country: 'Mauritius',
    blocked: true,
    prefix: 230,
  },
  {
    country: 'Mauritania',
    blocked: true,
    prefix: 222,
  },
  {
    country: 'Benin',
    blocked: true,
    prefix: 229,
  },
  {
    country: 'Ecuador',
    blocked: true,
    prefix: 593,
  },
  {
    country: 'Madagascar',
    blocked: true,
    prefix: 261,
  },
  {
    country: 'Ethiopia',
    blocked: true,
    prefix: 251,
  },
  {
    country: 'Kosovo',
    blocked: true,
    prefix: 383,
  },
  {
    country: 'Comoros',
    blocked: true,
    prefix: 269,
  },
];

module.exports = {
  blockedCountries,
};
