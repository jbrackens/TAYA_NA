/* @flow */
const phoneEmu = require('gstech-core/modules/sms/phoneEmu');
const mailEmu = require('gstech-core/modules/mailer/mailEmu');
const request = require('supertest-session');
const configuration = require('./configuration');
const app = require('./app');

let counter = 407000000 + (Date.now() % 1000000);

const registerTestPlayer = async (override: any): Promise<any> => {
  let pinCode;

  phoneEmu.registerReceiver((v) => {
    const matches = v.message.match(/\d+/);
    pinCode = matches ? matches[0] : '';
  });

  mailEmu.registerReceiver((v) => {
    const matches = v.text.match(/\d+/);
    pinCode = matches ? matches[0] : '';
  });

  const player = {
    pinCode: '0000',
    firstName: `Foo ${counter++}`,
    lastName: 'Foo',
    address: `Foobar ${counter++}`,
    postCode: '123123',
    city: 'Foobar123',
    dateOfBirth: '1985-01-01',
    countryISO: 'FI',
    currencyISO: 'EUR',
    languageISO: configuration.languages()[0].code,
    phone: `+358-${counter++}`,
    receivePromotional: '1',
    accept: '1',
    lang: configuration.languages()[0].code,
    email: `tech123${counter++}@luckydino.com`,
    password: 'Foobar123',
    ...override,
  };
  const session = request(app);
  await session.post('/api/activate/phone').send(player).expect(200);
  // eslint-disable-next-line no-promise-executor-return
  while (!pinCode) await new Promise((resolve) => setTimeout(resolve, 1000));
  await session
    .post('/api/register')
    .send({ ...player, pinCode })
    .expect(200);
  pinCode = null;
  return session;
};

module.exports = { registerTestPlayer };
