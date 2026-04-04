/* @flow */
const pg = require('gstech-core/modules/pg');
const { players: { john } } = require('../../../scripts/utils/db-data');
const Player = require('../players/Player');
const Fraud = require('../frauds/Fraud');
const Risk = require('./Risk');


describe('Risks', () => {
  let playerId;

  before(async () => {
    await clean.players();
    const player = await Player.create({ brandId: 'LD', ...john });
    const fraudId: any = await Fraud.addPlayerFraud(player.id, 'due_diligence_required', '123', { });
    await Fraud.check(fraudId, 1, false);
    const fraudId2: any = await Fraud.addPlayerFraud(player.id, 'several_payment_accounts', '124', { });
    await Fraud.check(fraudId2, 1, false);
    playerId = player.id;
  });

  it('gets player risk levels', async () => {
    const points = await Risk.getRiskLevel(playerId);
    expect(points).to.deep.equal({ transaction: 0, customer: 50, interface: 20, geo: 10, total: 20 });
  });

  it('gets player risk status', async () => {
    const status = await Risk.getRiskStatus(playerId, 'interface');
    expect(status).to.containSubset([
      {
        fraudKey: 'several_payment_accounts',
        name: 'Player has three or more payment accounts under same payment method',
        contribution: '20',
      },
    ])
  });

  it('gets player geo risk status', async () => {
    const status = await Risk.getRiskStatus(playerId, 'geo');
    expect(status).to.containSubset([
      {
        fraudKey: 'country_risk_profile',
        name: 'Country DE risk profile: low',
        contribution: 10,
        count: 1,
      },
    ])
  });

  it('gets player transaction risk status', async () => {
    await pg('report_daily_player_game_summary').insert({ playerId, gameId: 1,  manufacturerId: 'INT',  day: new Date(), type: 'bet',  count: 10,  amount: 1000,  bonusAmount: 0 });
    await pg('report_daily_player_game_summary').insert({ playerId, gameId: 21,  manufacturerId: 'INT',  day: new Date(), type: 'bet',  count: 5,  amount: 10000,  bonusAmount: 0 });
    const status = await Risk.getRiskStatus(playerId, 'transaction');
    expect(status).to.containSubset([
      {
        fraudKey: 'game_risk_profile',
        name: 'Game profile "Slots" with risk profile: low',
        contribution: 7,
        count: 10,
      },
      {
        fraudKey: 'game_risk_profile',
        name: 'Game profile "Table games" with risk profile: low',
        contribution: 3,
        count: 5,
      },
    ])
  });

  it('gets player risk log', async () => {
    const status = await Risk.getRiskLog(playerId, 'interface');
    expect(status).to.containSubset([
      {
        fraudKey: 'several_payment_accounts',
        name: 'Player has three or more payment accounts under same payment method',
        handle: 'Test',
        points: 20,
      },
    ])
  });
});
