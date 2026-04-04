/* @flow */
const request = require('supertest');

const pg = require('gstech-core/modules/pg');
const { players: { testPlayer } } = require('../../../scripts/utils/db-data');
const { addTransaction } = require('../payments/Payment');
const HourlyActivityUpdateJob = require('../reports/jobs/HourlyActivityUpdateJob');
const Player = require('../players/Player');

const app = require('../../index');

describe('Affiliates API Routes', () => {
  let player1;
  let player2;
  beforeEach(async () => {
    await clean.players();
    await setup.setFixedConversionRates();
    await pg.raw('delete from report_daily_brands');
    player1 = await Player.create(testPlayer({ brandId: 'LD', affiliateId: '100010', affiliateRegistrationCode: '100010_123123123123123' }));
    player2 = await Player.create(testPlayer({ brandId: 'LD', currencyId: 'SEK', countryId: 'SE', affiliateId: '100010', affiliateRegistrationCode: '100010_123123123123123' }));

    await pg.transaction(tx => addTransaction(player1.id, null, 'compensation', 5000, 'Play money', 1, tx));
    await HourlyActivityUpdateJob.update(new Date());
  });

  it.skip('can get registrations report', () =>
    request(app)
      .put('/api/LD/v1/reports/registrations')
      .send({
        date: new Date(),
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal([{
          playerId: player1.id,
          countryCode: 'DE',
          bannerTag: '100010_123123123123123',
          registrationIP: '195.163.47.141',
          registrationDate: res.body[0].registrationDate,
          username: player1.username,
        }, {
          playerId: player2.id,
          countryCode: 'SE',
          bannerTag: '100010_123123123123123',
          registrationIP: '195.163.47.141',
          registrationDate: res.body[1].registrationDate,
          username: player2.username,
        }]);
      }));

  it.skip('can get activities report', () =>
    request(app)
      .put('/api/LD/v1/reports/activities')
      .send({
        date: new Date(),
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset([{
          transferId: res.body[0].transferId,
          playerId: player1.id,
          activityDate: res.body[0].activityDate,
          brandId: 'LD',
          affiliateId: 100010,
          grossRevenue: 0,
          bonuses: 0,
          adjustments: 5000,
          turnover: 0,
          deposits: 0,
        }]);
      }));
});
