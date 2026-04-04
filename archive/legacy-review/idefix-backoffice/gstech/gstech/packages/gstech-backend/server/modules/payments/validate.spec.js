/* @flow */
const { validateProviderAccount } = require('./validate');
const { players: { testPlayer } } = require('../../../scripts/utils/db-data');
const Player = require('../players/Player');

describe('Payment account validation', () => {
  let player;

  before(async () => {
    const { john } = await setup.players();
    player = john;
  });

  it('it validates valid account', async () => {
    const valid = await validateProviderAccount(player, {
      provider: 'EMP',
      method: 'CreditCard',
    }, {
      accountId: 1000205,
      account: '401288******1881',
      parameters: {
        paymentIqAccountId: '7e1d2e36-42d1-4abb-a829-a0e7c6652caa',
        provider: 'EMP-disabled',
      },
    });
    expect(valid).to.equal(true);
  });

  it('it validates invalid account', async () => {
    const valid = await validateProviderAccount(player, {
      provider: 'Worldpay',
      method: 'CreditCard',
    }, {
      accountId: 1000205,
      account: '401288******1881',
      parameters: {
        paymentIqAccountId: '7e1d2e36-42d1-4abb-a829-a0e7c6652caa',
        provider: 'EMP',
      },
    });
    expect(valid).to.equal(false);
  });

  it('it validates player', async () => {
    const valid = await validateProviderAccount(player, {
      provider: 'Worldpay',
      method: 'CreditCard',
    }, {
      accountId: 1000205,
      account: '401288******1881',
      parameters: {
        token: '7e1d2e36-42d1-4abb-a829-a0e7c6652caa',
      },
    });
    expect(valid).to.equal(false);
  });
});

describe('with player in USD currency', () => {
  let player;

  before(async () => {
    player = await Player.create(testPlayer({ brandId: 'LD', currencyId: 'USD' }));
  });

  it('it validates player', async () => {
    const valid = await validateProviderAccount(player, {
      provider: 'Worldpay',
      method: 'CreditCard',
    }, {
      accountId: 1000205,
      account: '401288******1881',
      parameters: {
        token: '7e1d2e36-42d1-4abb-a829-a0e7c6652caa',
      },
    });
    expect(valid).to.equal(true);
  });
});
