/* @flow */
/* eslint-disable */

const { register, login, logout } = require('./ThunderkickAPI');
const nock = require('nock');

// nock.recorder.rec();

nock('https://qa-ext-casino.thunderkick.com:443')
  .post('/casino/3013/player/register', (data) => {
      return true;
    })
  .reply(200, {
    playerId: 123456,
  });

// nock('https://qa-ext-casino.thunderkick.com:443')
//   .post('/casino/3013/player/register', {
//     userName: 'LD_Jack.Sparrow',
//     password: 'topSecret',
//     currencyCode: 'SEK',
//     affiliate: 'affiliateCode',
//     promotionCode: 'superPromo',
//     firstName: 'firstname',
//     lastName: 'lastname',
//     displayName: 'queenOfTheSlots',
//     gender: 'F',
//     phone: '+46701234567',
//     externalReference: '12345',
//   })
//   .reply(524, {
//     errorCode: '1000',
//     errorMessage: 'Username: LD_Jack.Sparrow is already in use',
//   });

nock('https://qa-ext-casino.thunderkick.com:443')
  .post('/casino/3013/player/session/login', {
    userName: 'LD_6',
    password: 'topSecret',
    operatorSessionToken: '123456789',
  })
  .reply(200, {
    playerSessionToken: '1495098081913-36938-71KHJ475G2ZV2',
  });

nock('https://qa-ext-casino.thunderkick.com:443')
  .delete('/casino/3013/player/session/logout/1495098081913-36938-71KHJ475G2ZV2')
  .reply(204);

  const player = {
    id: 6,
    username: 'LD_Jack.Sparrow',
    nationalId: null,
    email: 'foo@bar.com',
    firstName: 'Jack',
    lastName: 'Sparrow',
    brandId: 'LD',
    currencyId: 'EUR',
    languageId: 'en',
    city: 'Foo',
    countryId: 'DE',
    createdAt: new Date(),
    dateOfBirth: '1994-12-12',
    nationalId: "123456789",
  };

describe('Thunderkick API', function (this: $npm$mocha$ContextDefinition) {
  this.timeout(30000);
  let playerId;
  let playerSessionToken;

  it('can register', async () => {
    playerId = await register(player);
    expect(playerId).to.equal(123456);
    expect(200);
  });

  it('can login', async () => {
    playerSessionToken = await login(player, '123456789');
    expect(playerSessionToken).to.equal('1495098081913-36938-71KHJ475G2ZV2');
  });

  it('can logout', async () => {
    await logout(playerSessionToken);
    expect(204);
  });
});
