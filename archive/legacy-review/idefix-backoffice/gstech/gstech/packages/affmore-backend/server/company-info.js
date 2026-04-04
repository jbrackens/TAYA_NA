// @flow
const { DateTime } = require('luxon');

const oldCompany = {
  name: 'Lucky Dino Gaming Limited',
  address1: 'Office 33, Regent House',
  address2: '8 Bisazza Street, SLM 1640, Sliema, Malta.',
  vatNumber: 'MT22420113',
};

const newCompany = {
  name: 'Esport Entertainment (Malta) ltd.',
  address1: '13/14 Penthouse Office',
  address2: 'Mannarino Road. Birkirkara BKR9080, Malta.',
  vatNumber: 'MT25295718',
};

const boundary = DateTime.local(2021, 4, 1).toJSDate();

const getCompanyInfo = (invoiceDate: Date): {
  name: string,
  address1: string,
  address2: string,
  vatNumber: string,
} => invoiceDate >= boundary ? newCompany : oldCompany;

module.exports = {
  getCompanyInfo,
};
