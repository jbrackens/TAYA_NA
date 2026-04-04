/* @flow */

const request = require('supertest');

const pg = require('gstech-core/modules/pg');

const app = require('../../index');
const {
  players: { john, jack },
} = require('../../../scripts/utils/db-data');
const Player = require('../players/Player');

describe('Persons routes', () => {
  let playerId;
  let otherPlayerId;

  before(async () => {
    await clean.players();
    const player = await Player.create({ brandId: 'LD', ...john });
    playerId = player.id;
    const otherPlayer = await Player.create({ brandId: 'LD', ...jack });
    otherPlayerId = otherPlayer.id;

    let transactionKey = '';
    let headers = {};
    await request(app)
      .post('/api/LD/v1/login')
      .send({ email: jack.email, password: jack.password, ipAddress: '94.222.17.20' })
      .expect(200)
      .expect((res) => {
        headers = { Authorization: `Token ${res.body.token}` };
      });

    await request(app)
      .post('/api/LD/v1/deposit')
      .send({
        depositMethod: 'BankTransfer_Entercash',
        amount: 500000,
        parameters: { foo: 'bar', zoo: 1 },
      })
      .set(headers)
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });

    await request(app)
      .post(`/api/LD/v1/deposit/${transactionKey}`)
      .send({
        amount: 500000,
        account: 'FI2112345600008739',
        externalTransactionId: '243254345543534534',
        accountHolder: 'John Doe',
        accountParameters: { token: '123123123312' },
      })
      .set(headers)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      })
      .expect(200);
  });

  describe('connectPlayersWithPersonHandler', () => {
    it('should be able to connect player with other players', async () => {
      const { body } = await request(app)
        .post(`/api/v1/player/${playerId}/persons`)
        .send({
          playerIds: [otherPlayerId],
        })
        .expect(200);

      expect(body).to.deep.equal({ ok: true });
      const players = await pg('players').whereIn('id', [playerId, otherPlayerId]);
      expect(players[0].personId).to.equal(players[1].personId);
    });

    it('should be able to get connected players', async () => {
      const { body } = await request(app)
        .get(`/api/v1/player/${playerId}/persons`)
        .expect(200);

      expect(body).to.deep.equal([
        {
          brandId: 'LD',
          email: 'jack.sparrow@gmail.com',
          firstName: 'Jack',
          id: otherPlayerId,
          riskProfile: 'low',
          lastName: 'Sparrow',
          currencyId: 'EUR',
          totalDepositAmount: '€5,000.00',
        },
      ]);
    });

    it('should be able to disconnect player from person', async () => {
      const { body } = await request(app)
        .delete(`/api/v1/player/${playerId}/persons`)
        .expect(200);

      expect(body).to.deep.equal({ ok: true });
      const players = await pg('players').whereIn('id', [playerId]);
      expect(players[0].personId).to.equal(null);
    });
  });
});
