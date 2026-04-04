/* @flow */
import type { WageringEvent } from 'gstech-core/modules/types/bus';

const { v1: uuid } = require('uuid');
const { createConsumer } = require('gstech-core/modules/bus');
const { players: { john, jack } } = require('../../../scripts/utils/db-data');
const { startDeposit, processDeposit } = require('../payments/deposits/Deposit');
const { getPlayerPromotions, setupPromotions, activatePromotion, getLeaderboard } = require('./Promotion');
const { updateCounters } = require('../limits/Counter');
const { placeBet, creditWin } = require('../game_round');
const { getWithProfile } = require('../games');
const { createSession, createManufacturerSession } = require('../sessions');
const Player = require('../players/Player');

const events = [];
createConsumer<WageringEvent>('WageringEvent', ({ data }) => {
  events.push(data);
  if (events.length > 2) {
    events.shift();
  }
  return Promise.resolve();
});

const playOneRound = (playerId: Id, sessionId: Id, manufacturerSessionId: Id, amount: Money = 1000) => async (gameId: string) => {
  const game = await getWithProfile('LD', 'NE', gameId);
  const externalGameRoundId = uuid();
  await placeBet(playerId, {
    manufacturerId: 'NE',
    game,
    sessionId,
    manufacturerSessionId,
    amount,
    externalGameRoundId,
    externalTransactionId: uuid(),
    closeRound: false,
    timestamp: new Date(),
  }, []);
  await creditWin(playerId, {
    manufacturerId: 'NE',
    game,
    sessionId,
    manufacturerSessionId,
    externalGameRoundId,
    externalTransactionId: uuid(),
    closeRound: true,
    timestamp: new Date(),
  }, [{ type: 'win', amount: 500 }]);
  await updateCounters(playerId);
};

describe('Promotion', () => {
  let playerId;
  let sessionId;
  let manufacturerSessionId;
  let playRound;

  beforeEach(async function (this: $npm$mocha$ContextDefinition) {
    this.timeout(30000);

    await clean.players();
    const player = await Player.create({ brandId: 'LD', ...john });
    playerId = player.id;
    const { id } = await createSession(player, '12.3.4.5');
    await setupPromotions(player.id);
    sessionId = id;
    manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId, 'desktop', {});
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    playRound = playOneRound(playerId, sessionId, manufacturerSessionId);
  });

  it('can create promotion and calculates bets based on game profile', async () => {
    await playRound('junglespirit_not_mobile_sw');
    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(events).to.containSubset([
      {
        permalink: 'junglespirit',
        brandId: 'LD',
        bet: 1000,
        win: 0,
        promotions: [
          {
            name: 'LD_REWARDS',
            value: 1000,
            contribution: 1000,
          },
        ],
      },
      {
        permalink: 'junglespirit',
        brandId: 'LD',
        bet: 0,
        win: 500,
        promotions: [
          {
            name: 'LD_REWARDS',
            value: 1000,
            contribution: 0,
          },
        ],
      },
    ]);
    await playRound('junglespirit_not_mobile_sw');
    await playRound('baccarat2_sw');
    const promotions = await getPlayerPromotions(playerId);
    expect(promotions).to.containSubset([
      {
        amount: 2000,
        promotion: 'LD_REWARDS',
        active: true,
        points: 20,
      },
      {
        promotion: 'LD_TEST',
        active: null,
        points: null,
      },
      {
        promotion: 'LD_BET_COUNT_TEST',
        active: null,
        points: null,
      },
    ]);
    expect(promotions.length).to.equal(5);
  });

  it('can activate non-autostarting promotion', async () => {
    await playRound('junglespirit_not_mobile_sw');

    await activatePromotion(playerId, 'LD_TEST');

    await playRound('junglespirit_not_mobile_sw');
    await playRound('bloodsuckers_not_mobile_sw');

    const promotions = await getPlayerPromotions(playerId);
    expect(promotions).to.containSubset([
      {
        amount: 2500,
        points: 25,
        promotion: 'LD_REWARDS',
        active: true,
      },
      {
        promotion: 'LD_TEST',
        active: true,
        amount: 1050,
        points: 10,
      },
      {
        promotion: 'LD_BET_COUNT_TEST',
        active: null,
        points: null,
      },
    ]);
    expect(promotions.length).to.equal(5);
  });
});

describe('Promotion when bonus money active', () => {
  let playerId;
  let sessionId;
  let manufacturerSessionId;
  let playRound;
  let playOverBetRound;

  beforeEach(async () => {
    await clean.players();
    const player = await Player.create({ brandId: 'LD', ...john });
    playerId = player.id;
    const { id } = await createSession(player, '12.3.4.5');
    await setupPromotions(player.id);
    sessionId = id;
    manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId, 'desktop', {});
    const { transactionKey } = await startDeposit(playerId, 1, 2000, 1001);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    playRound = playOneRound(playerId, sessionId, manufacturerSessionId, 400);
    playOverBetRound = playOneRound(playerId, sessionId, manufacturerSessionId, 1000);
  });

  it('can create promotion and calculates bets based on game profile', async () => {
    await playRound('junglespirit_not_mobile_sw');
    await playRound('junglespirit_not_mobile_sw');
    await playOverBetRound('junglespirit_not_mobile_sw');
    const promotions = await getPlayerPromotions(playerId);
    expect(promotions).to.containSubset([
      {
        amount: 1300,
        promotion: 'LD_REWARDS',
        active: true,
        points: 13,
      },
    ]);
    expect(promotions.length).to.equal(5);
  });
});

describe('Counter in other currency', () => {
  let playerId;
  let sessionId;
  let manufacturerSessionId;
  let playRound;

  beforeEach(async () => {
    await clean.players();
    const player = await Player.create({ ...john, brandId: 'LD', currencyId: 'SEK' });
    await activatePromotion(player.id, 'LD_BET_COUNT_TEST');
    playerId = player.id;
    const { id } = await createSession(player, '12.3.4.5');
    await setupPromotions(player.id);
    sessionId = id;
    manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId, 'desktop', {});
    const { transactionKey } = await startDeposit(playerId, 1, 20000);
    await processDeposit(20000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    playRound = playOneRound(playerId, sessionId, manufacturerSessionId);
  });

  it('can create promotion and calculates bets based on game profile', async () => {
    await playRound('junglespirit_not_mobile_sw');
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(events).to.containSubset([
      {
        permalink: 'junglespirit',
        brandId: 'LD',
        bet: 100,
        win: 0,
        promotions: [
          {
            name: 'LD_REWARDS',
            value: 100,
            contribution: 100,
          },
        ],
      },
      {
        permalink: 'junglespirit',
        brandId: 'LD',
        bet: 0,
        win: 50,
        promotions: [
          {
            name: 'LD_REWARDS',
            value: 100,
            contribution: 0,
          },
        ],
      },
    ]);
    await playRound('junglespirit_not_mobile_sw');
    await playRound('baccarat2_sw');
    const promotions = await getPlayerPromotions(playerId);
    expect(promotions).to.containSubset([
      {
        amount: 2000,
        promotion: 'LD_REWARDS',
        active: true,
        points: 2,
      },
      {
        promotion: 'LD_TEST',
        active: null,
        points: null,
      },
    ]);
    expect(promotions.length).to.equal(5);
  });

  it('can activate non-autostarting promotion', async () => {
    await playRound('junglespirit_not_mobile_sw');

    await activatePromotion(playerId, 'LD_TEST');

    await playRound('junglespirit_not_mobile_sw');
    await playRound('bloodsuckers_not_mobile_sw');

    const promotions = await getPlayerPromotions(playerId);
    expect(promotions).to.containSubset([
      {
        amount: 2500,
        points: 2,
        promotion: 'LD_REWARDS',
        active: true,
      },
      {
        promotion: 'LD_TEST',
        active: true,
        amount: 1050,
        points: 1,
      },
    ]);
    expect(promotions.length).to.equal(5);
  });
});

describe('Counter counting only specific games', () => {
  let playerId;
  let sessionId;
  let manufacturerSessionId;
  let playRound;

  beforeEach(async () => {
    await clean.players();
    const player = await Player.create({ ...john, brandId: 'LD', currencyId: 'SEK' });
    playerId = player.id;
    const { id } = await createSession(player, '12.3.4.5');
    await setupPromotions(player.id);
    sessionId = id;
    manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId, 'desktop', {});
    const { transactionKey } = await startDeposit(playerId, 1, 20000);
    await processDeposit(20000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    await activatePromotion(playerId, 'LD_BET_COUNT_TEST');
    playRound = playOneRound(playerId, sessionId, manufacturerSessionId);
  });

  it('counts number of bets for promotion', async () => {
    await playRound('junglespirit_not_mobile_sw');
    await playRound('junglespirit_not_mobile_sw');
    await playRound('bloodsuckers_not_mobile_sw');

    const promotions = await getPlayerPromotions(playerId);
    expect(promotions).to.containSubset([
      {
        promotion: 'LD_BET_COUNT_TEST',
        active: true,
        points: 3,
        amount: 300,
      },
      {
        amount: 2500,
        points: 2,
        promotion: 'LD_REWARDS',
        active: true,
      },
      {
        promotion: 'LD_TEST',
        active: null,
        amount: null,
        points: null,
      },
    ]);
    expect(promotions.length).to.equal(5);
  });
});

describe('Promotion counting only specific games', () => {
  let playerId;
  let sessionId;
  let manufacturerSessionId;
  let playRound;

  before(async function (this: $npm$mocha$ContextDefinition) {
    this.timeout(3000);
    await clean.players();
    const player = await Player.create({ brandId: 'LD', ...john });
    playerId = player.id;
    const { id } = await createSession(player, '12.3.4.5');
    await setupPromotions(player.id);
    sessionId = id;
    manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId, 'desktop', {});
    const { transactionKey } = await startDeposit(playerId, 1, 20000);
    await processDeposit(20000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    await activatePromotion(playerId, 'LD_GAME_PROMOTION');
    playRound = playOneRound(playerId, sessionId, manufacturerSessionId);
  });

  it('can create promotion and calculates bets based on game profile', async () => {
    await playRound('junglespirit_not_mobile_sw');
    await playRound('junglespirit_not_mobile_sw');
    await playRound('junglespirit_not_mobile_sw');
    await playRound('junglespirit_not_mobile_sw');
    await playRound('junglespirit_not_mobile_sw');
    await playRound('junglespirit_not_mobile_sw');
    await playRound('junglespirit_not_mobile_sw');
    await playRound('wildwildwest_not_mobile_sw');
    await playRound('wildwildwest_not_mobile_sw');
    await playRound('wildwildwest_not_mobile_sw');
    await playRound('wildwildwest_not_mobile_sw');
    await playRound('wildwildwest_not_mobile_sw');
    await playRound('wildwildwest_not_mobile_sw');
    await playRound('baccarat2_sw');

    const promotions = await getPlayerPromotions(playerId);
    expect(promotions).to.containSubset([
      {
        amount: 13000,
        promotion: 'LD_REWARDS',
        active: true,
        points: 130,
      },
      {
        amount: 700,
        promotion: 'LD_GAME_PROMOTION',
        active: true,
        points: 7,
      },
      {
        promotion: 'LD_MINIMUM_CONTRIBUTION',
        active: null,
        points: null,
      },
    ]);
  });

  it('gives points for other player', async () => {
    const player = await Player.create({ brandId: 'LD', ...jack });
    const { id } = await createSession(player, '12.3.4.5');
    await setupPromotions(player.id);
    const mid = await createManufacturerSession('NE', uuid(), id, 'desktop', {});
    const { transactionKey } = await startDeposit(player.id, 1, 20000);
    await processDeposit(20000, transactionKey, 'FI2112345600008740', null, 'external-id5213', 'complete');
    await activatePromotion(player.id, 'LD_GAME_PROMOTION');
    await playOneRound(player.id, id, mid)('junglespirit_not_mobile_sw');
    await playOneRound(player.id, id, mid)('junglespirit_not_mobile_sw');
  });

  it('returns leaderboard for given promotion', async () => {
    const leaderboard = await getLeaderboard(['LD'], 'LD_GAME_PROMOTION', 10);
    expect(leaderboard).to.containSubset([
      {
        amount: 700,
        firstName: 'John',
        lastName: 'Doe',
        points: 7,
      },
      {
        amount: 200,
        firstName: 'Jack',
        lastName: 'Sparrow',
        points: 2,
      },
    ]);
  });
});

describe('promotion requiring minimum contribution per bet', () => {
  let playerId;
  let sessionId;
  let manufacturerSessionId;
  let playRound;
  let playBigBetRound;

  beforeEach(async () => {
    await clean.players();
    const player = await Player.create({ ...john, brandId: 'LD', currencyId: 'SEK' });
    playerId = player.id;
    const { id } = await createSession(player, '12.3.4.5');
    await setupPromotions(player.id);
    sessionId = id;
    manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId, 'desktop', {});
    const { transactionKey } = await startDeposit(playerId, 1, 20000);
    await processDeposit(20000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    await activatePromotion(playerId, 'LD_MINIMUM_CONTRIBUTION');
    playRound = playOneRound(playerId, sessionId, manufacturerSessionId, 100);
    playBigBetRound = playOneRound(playerId, sessionId, manufacturerSessionId, 1000);
  });

  it('does not count bets under given number of points', async () => {
    await playRound('junglespirit_not_mobile_sw');
    await playRound('junglespirit_not_mobile_sw');
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(events).to.containSubset([
      {
        permalink: 'junglespirit',
        brandId: 'LD',
        bet: 10,
        win: 0,
        promotions: [
          {
            name: 'LD_REWARDS',
            value: 20,
            contribution: 10,
          },
          {
            name: 'LD_MINIMUM_CONTRIBUTION',
            value: 0,
            contribution: 0,
          },
        ],
      },
      {
        permalink: 'junglespirit',
        brandId: 'LD',
        bet: 0,
        win: 50,
        promotions: [
          {
            name: 'LD_REWARDS',
            value: 20,
            contribution: 0,
          },
          {
            name: 'LD_MINIMUM_CONTRIBUTION',
            value: 0,
            contribution: 0,
          },
        ],
      },
    ]);

    const promotions = await getPlayerPromotions(playerId);
    expect(promotions).to.containSubset([
      {
        promotion: 'LD_MINIMUM_CONTRIBUTION',
        active: true,
        points: 0,
        amount: 0,
      },
    ]);
    expect(promotions.length).to.equal(5);
  });

  it('counts bets equal to given number of points', async () => {
    await playBigBetRound('junglespirit_not_mobile_sw');
    await playBigBetRound('junglespirit_not_mobile_sw');
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(events).to.containSubset([
      {
        permalink: 'junglespirit',
        brandId: 'LD',
        bet: 100,
        win: 0,
        promotions: [
          {
            name: 'LD_REWARDS',
            value: 200,
            contribution: 100,
          },
          {
            name: 'LD_MINIMUM_CONTRIBUTION',
            value: 200,
            contribution: 100,
          },
        ],
      },
      {
        permalink: 'junglespirit',
        brandId: 'LD',
        bet: 0,
        win: 50,
        promotions: [
          {
            name: 'LD_MINIMUM_CONTRIBUTION',
            value: 200,
            contribution: 0,
          },
          {
            name: 'LD_REWARDS',
            value: 200,
            contribution: 0,
          },
        ],
      },
    ]);

    const promotions = await getPlayerPromotions(playerId);
    expect(promotions).to.containSubset([
      {
        promotion: 'LD_MINIMUM_CONTRIBUTION',
        active: true,
        points: 2,
        amount: 2000,
      },
    ]);
    expect(promotions.length).to.equal(5);
  });
});
