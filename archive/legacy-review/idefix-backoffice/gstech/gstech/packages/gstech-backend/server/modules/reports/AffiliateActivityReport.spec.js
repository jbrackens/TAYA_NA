/* @flow */
const { v1: uuid } = require('uuid');
const pg = require('gstech-core/modules/pg');
const { players: { testPlayer } } = require('../../../scripts/utils/db-data');
const AffiliateRegistrationReport = require('./AffiliateRegistrationReport');
const AffiliateActivityReport = require('./AffiliateActivityReport');
const HourlyActivityUpdateJob = require('./jobs/HourlyActivityUpdateJob');
const { addTransaction } = require('../payments/Payment');
const { startDeposit, processDeposit } = require('../payments/deposits/Deposit');
const { creditBonus } = require('../bonuses');
const { placeBet } = require('../game_round');
const { createSession, createManufacturerSession } = require('../sessions');
const { getWithProfile } = require('../games');

const Player = require('../players/Player');

describe('Affiliate reports', () => {
  let player1;
  let player2;
  beforeEach(async () => {
    await clean.players();
    await setup.setFixedConversionRates();
    await pg.raw('delete from report_daily_brands');
    const [p1, p2] = await Promise.all([
      Player.create(
        testPlayer({
          brandId: 'LD',
          affiliateId: '100010',
          affiliateRegistrationCode: '100010_123123123123123',
        }),
      ),
      Player.create(
        testPlayer({
          brandId: 'LD',
          currencyId: 'SEK',
          countryId: 'SE',
          affiliateId: '100010',
          affiliateRegistrationCode: '100010_123123123123123',
        }),
      ),
    ]);
    player1 = p1;
    player2 = p2;
  });

  it('generates affiliate registration report', async () => {
    const report = await AffiliateRegistrationReport.report(new Date(), 'LD');
    expect(report).to.containSubset([
      {
        playerId: `${player2.id}`,
        countryCode: 'SE',
        bannerTag: '100010_123123123123123',
        registrationIP: '195.163.47.141',
      },
      {
        playerId: `${player1.id}`,
        countryCode: 'DE',
        bannerTag: '100010_123123123123123',
        registrationIP: '195.163.47.141',
      },
    ]);
  });

  it('records player compensations', async () => {
    await pg.transaction(tx => addTransaction(player1.id, null, 'compensation', 5000, 'Play money', 1, tx));
    await HourlyActivityUpdateJob.update(new Date());
    const report = await AffiliateActivityReport.report(new Date(), 'LD');
    expect(report).to.containSubset([
      {
        adjustments: '50.00',
        bonuses: '0.00',
        deposits: '0.00',
        grossRevenue: '0.00',
        brandId: 'LD',
        turnover: '0.00',
      },
    ]);
  });

  it('records player deposits', async () => {
    const { transactionKey } = await startDeposit(player1.id, 1, 2000);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');

    await HourlyActivityUpdateJob.update(new Date());
    const report = await AffiliateActivityReport.report(new Date(), 'LD');
    expect(report).to.containSubset([
      {
        adjustments: '0.00',
        bonuses: '0.00',
        deposits: '20.00',
        grossRevenue: '0.00',
        brandId: 'LD',
        turnover: '0.00',
      },
    ]);
  });

  it('records player bonuses', async () => {
    await creditBonus(1001, player1.id, 5000);
    await HourlyActivityUpdateJob.update(new Date());
    const report = await AffiliateActivityReport.report(new Date(), 'LD');
    expect(report).to.containSubset([
      {
        adjustments: '0.00',
        bonuses: '50.00',
        deposits: '0.00',
        grossRevenue: '0.00',
        brandId: 'LD',
        turnover: '0.00',
      },
    ]);
  });

  it('records player turnover and revenue', async () => {
    const { id } = await createSession({ id: player1.id, brandId: 'LD' }, '1.2.3.4');
    const manufacturerSessionId = await createManufacturerSession('NE', uuid(), id, 'desktop', {});
    const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
    const { transactionKey } = await startDeposit(player1.id, 1, 2000);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    await placeBet(player1.id, {
      manufacturerId: 'NE',
      game,
      sessionId: id,
      manufacturerSessionId,
      amount: 500,
      externalGameRoundId: uuid(),
      externalTransactionId: uuid(),
      closeRound: true,
      timestamp: new Date(),
    }, [{ amount: 10000, type: 'win' }]);
    await creditBonus(1001, player1.id, 5000);
    await placeBet(player1.id, {
      manufacturerId: 'NE',
      game,
      sessionId: id,
      manufacturerSessionId,
      amount: 500,
      externalGameRoundId: uuid(),
      externalTransactionId: uuid(),
      closeRound: true,
      timestamp: new Date(),
    }, []);

    await HourlyActivityUpdateJob.update(new Date());
    const report = await AffiliateActivityReport.report(new Date(), 'LD');
    expect(report).to.containSubset([
      {
        adjustments: '0.00',
        bonuses: '50.00',
        deposits: '20.00',
        grossRevenue: '-90.00',
        brandId: 'LD',
        turnover: '10.00',
      },
    ]);
  });

  it('processes currency conversions', async () => {
    const { id } = await createSession({ id: player2.id, brandId: 'LD' }, '1.2.3.4');
    const manufacturerSessionId = await createManufacturerSession('NE', uuid(), id, 'desktop', {});
    const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
    const { transactionKey } = await startDeposit(player2.id, 1, 20000);
    await processDeposit(20000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    await placeBet(player2.id, {
      manufacturerId: 'NE',
      game,
      sessionId: id,
      manufacturerSessionId,
      amount: 5000,
      externalGameRoundId: uuid(),
      externalTransactionId: uuid(),
      closeRound: true,
      timestamp: new Date(),
    }, [{ amount: 10000, type: 'win' }]);
    await creditBonus(1001, player2.id, 50000);
    await placeBet(player2.id, {
      manufacturerId: 'NE',
      game,
      sessionId: id,
      manufacturerSessionId,
      amount: 8000,
      externalGameRoundId: uuid(),
      externalTransactionId: uuid(),
      closeRound: true,
      timestamp: new Date(),
    }, []);

    await HourlyActivityUpdateJob.update(new Date());
    const report = await AffiliateActivityReport.report(new Date(), 'LD');
    expect(report).to.containSubset([
      {
        adjustments: '0.00',
        bonuses: '50.00',
        deposits: '20.00',
        grossRevenue: '3.00',
        turnover: '13.00',
        brandId: 'LD',
      },
    ]);
  });
});
