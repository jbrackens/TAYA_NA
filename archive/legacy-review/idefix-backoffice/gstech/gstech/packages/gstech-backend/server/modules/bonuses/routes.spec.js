/* @flow */
const request = require('supertest');
const moment = require('moment-timezone');
const app = require('../../index');

describe('Bonuses', () => {
  let john;

  before(async () => {
    const { john: player } = await setup.players();
    john = player;
  });

  it('lists available bonuses for player', async () => {
    await request(app)
      .get(`/api/v1/player/${john.id}/bonuses/available`)
      .expect((res) => {
        expect(res.body).to.deep.equal([
          { id: 'DEPOSIT_OFFER_TEST', title: 'DEPOSIT_OFFER_TEST (5x wagering)' },
          { id: 'LD_AFF5E', title: 'LD_AFF5E' },
          { id: 'LD_FIRST_DEPOSIT', title: 'LD_FIRST_DEPOSIT (50x wagering)' },
          { id: 'LD_MANUAL', title: 'LD_MANUAL (50x wagering)' },
          { id: 'LD_MANUAL_NOWAGER', title: 'LD_MANUAL_NOWAGER' },
          { id: 'LD_MONTHLY_RELOAD', title: 'LD_MONTHLY_RELOAD (50x wagering)' },
          { id: 'LD_SECOND_DEPOSIT', title: 'LD_SECOND_DEPOSIT (50x wagering)' },
        ]);
      });
  });

  it('credits manual bonus to player and returns updated balance', async () => {
    await request(app)
      .post(`/api/v1/player/${john.id}/bonuses`)
      .send({
        id: 'LD_MANUAL',
        amount: 1000,
        expiryDate: moment().add(1, 'month').toDate(),
      })
      .expect((res) => {
        expect(res.body).to.containSubset({ update: { balance: { formatted: { totalBalance: '10.00' } } } });
      })
      .expect(200);
  });

  it('lists all bonuses for player', async () => {
    await request(app)
      .get(`/api/v1/player/${john.id}/bonuses`)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset([
          {
            bonus: 'LD_MANUAL',
            status: 'active',
            amount: '€10.00',
            wagering: '€0.00/€500.00',
            balance: '€10.00',
          },
        ]);
      });
  });
});
