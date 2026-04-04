/* @flow */
import type { PlayerDraft } from 'gstech-core/modules/types/player';

const phoneNumber = require('gstech-core/modules/phoneNumber');

let counter = 3950000000 + (Date.now() % 1000000);

const john: any = {
  password: 'JohnDoe123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@hotmail.com',
  address: 'Knesebeckstraße 98',
  postCode: '48317',
  city: 'Drensteinfurt',
  countryId: 'DE',
  dateOfBirth: '1985-12-14',
  mobilePhone: '4903944433231',
  languageId: 'de',
  currencyId: 'EUR',
  ipAddress: '195.163.47.141',
  activated: true,
  allowSMSPromotions: true,
  allowEmailPromotions: true,
  tcVersion: 4,
};

const jack: any = {
  password: 'JackSparrow123',
  firstName: 'Jack',
  lastName: 'Sparrow',
  email: 'jack.sparrow@gmail.com',
  address: 'Fugger Strasse 56',
  postCode: '06820',
  city: 'Dessau',
  countryId: 'DE',
  dateOfBirth: '1989-02-01',
  mobilePhone: '490394573231',
  languageId: 'de',
  nationalId: '36589852554745',
  currencyId: 'EUR',
  ipAddress: '195.163.47.141',
  affiliateRegistrationCode: '100010_123123123123',
  activated: true,
  allowSMSPromotions: true,
  allowEmailPromotions: true,
  tcVersion: 4,
};

module.exports = {
  players: {
    john,
    jack,
    testPlayer: (override: any): PlayerDraft & { brandId: BrandId } => ({ ...jack,
      email: `jack.${counter++}@hotmail.com`, // eslint-disable-line no-plusplus
      mobilePhone: phoneNumber.parse(`490${counter++}`), // eslint-disable-line no-plusplus
      ...override }),
  },
};
