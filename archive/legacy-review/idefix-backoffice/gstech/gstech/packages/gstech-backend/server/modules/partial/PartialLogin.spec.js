/* @flow */
const { v1: uuid } = require('uuid');
const pg = require('gstech-core/modules/pg');
const PartialLogin = require('./PartialLogin');

describe('Partial Login', () => {
  const transactionKey = uuid();
  const loginData = {
    transactionKey,
    amount: 10000,
    paymentMethod: 'Trustly',
    languageId: 'fi',
    currencyId: 'EUR',
    countryId: 'FI',
    ipAddress: '192.168.0.1',
    tcVersion: 0,
  };

  it('can create partial login', async () => {
    const login = await PartialLogin.create(pg, loginData);
    expect(login).to.containSubset({
      ...loginData,
      status: 'started',
    });
  });

  it('can get started partial login', async () => {
    const login = await PartialLogin.get(pg, transactionKey, 'started');
    expect(login).to.containSubset({
      ...loginData,
      status: 'started',
    });
  });

  it('can verify partial login', async () => {
    const [login] = await PartialLogin.verify(pg, transactionKey, null);
    expect(login).to.containSubset({
      ...loginData,
      status: 'verified',
    });
  });

  it('can complete partial login', async () => {
    const [login] = await PartialLogin.complete(pg, transactionKey);
    expect(login).to.containSubset({
      ...loginData,
      status: 'completed',
    });
  });
});
