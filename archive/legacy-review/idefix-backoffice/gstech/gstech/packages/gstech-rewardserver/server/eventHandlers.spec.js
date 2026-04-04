/* @flow */
import type { WageringEvent } from 'gstech-core/modules/types/bus';

const pg = require('gstech-core/modules/pg');

const { handleBetEvent } = require('./eventHandlers');
const { createRewardDefinition } = require('./modules/reward-definitions/RewardDefinitions');
const { upsertReward } = require('./modules/rewards/Rewards');
const cleanDb = require('../jobs/cleanData');
const { games } = require('./mockData');

const cleanupProgresses = async () => {
  await pg('progresses_rewards').delete();
  await pg('progresses_ledgers').delete();
  await pg('game_progresses').delete();
  await pg('progresses').delete();
  await pg('ledgers').delete();
};

describe('eventHandlers', () => {
  const rds = [];
  const rs = [];
  before(async () => {
    await pg('games').insert(games);
    await pg('games').insert({ ...games[0], id: 10, brandId: 'LD' });

    // Reward definitions
    rds.push((await createRewardDefinition(pg, { rewardType: 'bountyCycle', brandId: 'LD', followUpdates: true, promotion: 'CJ_Bounties_new' })).id);
    rds.push((await createRewardDefinition(pg, { rewardType: 'wheelSpin', brandId: 'LD', followUpdates: true, promotion: 'CJ_LOYALTY_POINTS' })).id);
    rds.push((await createRewardDefinition(pg, { rewardType: 'rewardCycle', brandId: 'LD', followUpdates: true, promotion: 'different_promo' })).id);

    rds.push((await createRewardDefinition(pg, { rewardType: 'bountyCycle', brandId: 'KK', followUpdates: true })).id);

    rds.push((await createRewardDefinition(pg, { rewardType: 'bountyCycle', brandId: 'OS', followUpdates: true })).id);
    rds.push((await createRewardDefinition(pg, { rewardType: 'rewardCycle', brandId: 'OS', followUpdates: true })).id);

    rds.push((await createRewardDefinition(pg, { rewardType: 'bountyCycle', brandId: 'CJ', followUpdates: true, promotion: 'Promotion' })).id);
    rds.push((await createRewardDefinition(pg, { rewardType: 'rewardCycle', brandId: 'CJ', followUpdates: true, promotion: 'Promotion' })).id);
    rds.push((await createRewardDefinition(pg, { rewardType: 'iron', brandId: 'CJ', followUpdates: true })).id);

    // Rewards
    rs.push((await upsertReward(pg, { rewardDefinitionId: rds[0], bonusCode: 'Some code', creditType: 'bonus', description: '', externalId: 'a1', order: 1, metadata: { trigger_phase: 1000 } })).id);
    rs.push((await upsertReward(pg, { rewardDefinitionId: rds[1], bonusCode: 'Some code2', creditType: 'wheelSpin', description: '', externalId: 'a2', order: 1 })).id);
    rs.push((await upsertReward(pg, { rewardDefinitionId: rds[2], bonusCode: 'Some code2.5', creditType: 'freeSpins', gameId: games[0].id, spins: 10, description: '', externalId: 'a2.5', order: 1, metadata: { trigger_phase: 1000 } })).id);
    rs.push((await upsertReward(pg, { rewardDefinitionId: rds[3], bonusCode: 'Some code3', creditType: 'freeSpins', gameId: games[0].id, spins: 10, description: '', externalId: 'a3', order: 1, metadata: { trigger_phase: 1 } })).id);
    rs.push((await upsertReward(pg, { rewardDefinitionId: rds[4], bonusCode: 'Some code4', creditType: 'freeSpins', gameId: games[0].id, spins: 10, description: '', externalId: 'a4', order: 1, metadata: { trigger_phase: 1000 } })).id);
    rs.push((await upsertReward(pg, { rewardDefinitionId: rds[5], bonusCode: 'Some code5', creditType: 'freeSpins', gameId: games[0].id, spins: 10, description: '', externalId: 'a5', order: 1, metadata: { trigger_phase: 1000 } })).id);
    rs.push((await upsertReward(pg, { rewardDefinitionId: rds[6], bonusCode: 'Some code6', creditType: 'freeSpins', gameId: games[0].id, spins: 10, description: '', externalId: 'a6', order: 1, metadata: { trigger_phase: 1000 } })).id);
    rs.push((await upsertReward(pg, { rewardDefinitionId: rds[7], bonusCode: 'Some code7', creditType: 'freeSpins', gameId: games[0].id, spins: 10, description: '', externalId: 'a7', order: 1, metadata: { trigger_phase: 1000 } })).id);
    rs.push((await upsertReward(pg, { rewardDefinitionId: rds[8], bonusCode: 'Some code8', creditType: 'freeSpins', gameId: games[0].id, spins: 10, description: '', externalId: 'a8', order: 1 })).id);
  });

  // Instead of using transaction and throwing an error to roll back, clean tables we operate on
  afterEach(async () => cleanupProgresses());
  after(cleanDb);

  describe('handleBetEvent', () => {
    it('creates 3 progress pairs (1 only initialized) when bet has 2 promotions and there is 2 matching promotions in reward definitions', async () => {
      const bet: WageringEvent = {
        playerId: 123,
        brandId: 'LD',
        permalink: 'bookofdead',
        bet: 12,
        win: 0,
        promotions: [
          { name: 'CJ_Bounties_new', value: 10, contribution: 10 },
          { name: 'CJ_LOYALTY_POINTS', value: 8, contribution: 8 },
        ],
      };

      await handleBetEvent(pg, bet);

      const progresses = await pg('progresses');
      expect(progresses.length).to.equal(3);
      expect(progresses.map(({ perRewardDefinitionCount }) => perRewardDefinitionCount)).to.have.members([1, 1, 1]);

      const wheelSpinProgresses = progresses.filter(el => el.contribution === 8);
      expect(wheelSpinProgresses.length).to.equal(1);
      expect(wheelSpinProgresses[0].target).to.equal(500000);
      expect(progresses.filter(el => el.contribution === 10).length).to.equal(1);

      const initializedProgresses = progresses.filter(el => el.contribution === 0);
      expect(initializedProgresses.length).to.equal(1);
      expect(initializedProgresses[0].betCount).to.equal(0);
      expect(initializedProgresses[0].contribution).to.equal(0);

      const gameProgresses = await pg('game_progresses');
      expect(gameProgresses.length).to.equal(3);
      expect(gameProgresses.filter(el => el.betAmount === 12).length).to.equal(2);
      expect(gameProgresses.filter(el => el.betAmount === 0).length).to.equal(1);
    });

    it('Initialize only when bet has 1 promotion that does not match', async () => {
      const bet: WageringEvent = {
        playerId: 123,
        brandId: 'LD',
        permalink: 'bookofdead',
        bet: 12,
        win: 0,
        promotions: [
          { name: 'Some other', value: 10, contribution: 10 },
        ],
      };

      await handleBetEvent(pg, bet);

      const progresses = await pg('progresses');
      expect(progresses.length).to.equal(3);
      expect(progresses.map(({ contribution }) => contribution)).to.have.members([0, 0, 0]);
      expect(progresses.map(({ betCount }) => betCount)).to.have.members([0, 0, 0]);
    });

    it('creates 3 progress pairs (2 only initialized) when bet has 2 promotions that does not match and 1 reward definition without promotion', async () => {
      const bet: WageringEvent = {
        playerId: 123,
        brandId: 'CJ',
        permalink: 'bookofdead',
        bet: 12,
        win: 0,
        promotions: [
          { name: 'Some other', value: 10, contribution: 10 },
          { name: 'Some other2', value: 10, contribution: 10 },
        ],
      };

      await handleBetEvent(pg, bet);

      const progresses = await pg('progresses');
      expect(progresses.length).to.equal(3);
      expect(progresses.filter(({ contribution }) => contribution === 12).length).to.equal(1);
      expect(progresses.filter(({ contribution }) => contribution === 0).length).to.equal(2);
    });

    it('creates 3 progress pairs (1 only initialized) when bet has 1 promotions and there is 2/3 matching promotions in reward definitions', async () => {
      const bet: WageringEvent = {
        playerId: 123,
        brandId: 'CJ',
        permalink: 'bookofdead',
        bet: 12,
        win: 0,
        promotions: [
          { name: 'Promotion', value: 10, contribution: 10 },
        ],
      };

      await handleBetEvent(pg, bet);

      const progresses = await pg('progresses');
      expect(progresses.length).to.equal(3);
      expect(progresses.map(({ contribution }) => contribution)).to.have.members([10, 10, 12]);
      expect(progresses.map(({ betCount }) => betCount)).to.have.members([1, 1, 1]);
    });

    it('creates 1 progress pair when bet has 0 promotions and there is 1 reward definition without promotion', async () => {
      const bet: WageringEvent = {
        playerId: 123,
        brandId: 'KK',
        permalink: 'bookofdead',
        bet: 12,
        win: 0,
        promotions: [],
      };

      await handleBetEvent(pg, bet);

      const progresses = await pg('progresses');
      expect(progresses[0].perRewardDefinitionCount).to.equal(1);
      expect(progresses[0].contribution).to.equal(12);
    });

    it('creates 2 progress pairs when bet has 0 promotions and there are 2 reward definitions without promotions', async () => {
      const bet: WageringEvent = {
        playerId: 123,
        brandId: 'OS',
        permalink: 'bookofdead',
        bet: 12,
        win: 0,
        promotions: [],
      };

      await handleBetEvent(pg, bet);

      const progresses = await pg('progresses');
      expect(progresses.length).to.equal(2);
      expect(progresses[0].perRewardDefinitionCount).to.equal(1);
      expect(progresses[1].perRewardDefinitionCount).to.equal(1);
      expect(progresses[0].contribution).to.equal(12);
      expect(progresses[1].contribution).to.equal(12);
    });

    it('creates 1 progress pair and updates it on another similar bet when there is 1 reward definition without promotion', async () => {
      const bet: WageringEvent = {
        playerId: 123,
        brandId: 'KK',
        permalink: 'bookofdead',
        bet: 12,
        win: 0,
        promotions: [],
      };

      await Promise.all([handleBetEvent(pg, bet), handleBetEvent(pg, bet)]);

      const progresses = await pg('progresses');
      expect(progresses.length).to.equal(1);
      expect(progresses[0].perRewardDefinitionCount).to.equal(1);
      expect(progresses[0].contribution).to.equal(24);
      expect(progresses[0].betCount).to.equal(2);
      expect(progresses[0].updatedAt).to.not.equal(null);
    });

    it('does not count event without bet', async () => {
      const bet: WageringEvent = {
        playerId: 123,
        brandId: 'KK',
        permalink: 'bookofdead',
        bet: 0,
        win: 12,
        promotions: [],
      };

      await handleBetEvent(pg, bet);

      const progresses = await pg('progresses');
      expect(progresses.length).to.equal(1);
      expect(progresses[0].perRewardDefinitionCount).to.equal(1);
      expect(progresses[0].contribution).to.equal(0);
      expect(progresses[0].betCount).to.equal(0);
    });

    it('concurrency test for 16 simultaneous bet events for 2 users', async () => {
      const playerIds = [1, 2];
      const permalinks = ['bookofdead', 'firejoker'];
      const betAmounts = [10, 20];
      const wins = [0, 100];
      const bets: WageringEvent[] = [];
      playerIds.map(pId => permalinks.map(permalink => betAmounts.map(b => wins.map(w => bets.push({
        playerId: pId,
        brandId: 'KK',
        permalink,
        bet: b,
        win: w,
        promotions: [],
      })))));

      await Promise.all(bets.map(bet => handleBetEvent(pg, bet)));

      // It needs to be mocked later on when we have "real" implementation
      const progresses = await pg('progresses');
      expect(progresses.length).to.equal(4);

      const completeProgresses = progresses.filter(p => p.completedAt !== null);
      expect(completeProgresses.length).to.equal(2);
      expect(completeProgresses.find(cp => cp.playerId === 1)).to.not.equal(null);
      expect(completeProgresses.find(cp => cp.playerId === 2)).to.not.equal(null);

      const incompleteProgresses = progresses.filter(p => p.completedAt === null);
      expect(incompleteProgresses[0].contribution).to.equal(20);
      expect(incompleteProgresses[1].contribution).to.equal(20);

      const playerProgresses = progresses.filter(p => p.playerId === 1);
      expect(playerProgresses.reduce((prev, curr) => prev + curr.betCount, 0)).to.equal(8);
      const completePlayerProgress = playerProgresses.find(pp => pp.completedAt !== null);
      const incompletePlayerProgress = playerProgresses.find(pp => pp.completedAt === null);
      expect(completePlayerProgress.perRewardDefinitionCount).to.equal(1);
      // TODO: We're checking if rewardId is matching
      // Instead we should be checking if rewardDefinitionId is matching
      if (completePlayerProgress.rewardId === incompletePlayerProgress.rewardId) {
        expect(incompletePlayerProgress.perRewardDefinitionCount, 'perRewardDefinition count').to.equal(2);
      } else {
        expect(incompletePlayerProgress.perRewardDefinitionCount, 'perRewardDefinition count').to.equal(1);
      }

      const gameProgresses = await pg('game_progresses');

      const gameProgressPlayerGame = gameProgresses.filter(gp => gp.playerId === 1 && gp.gameId === games[0].id);
      expect(gameProgressPlayerGame.reduce((prev, curr) => prev + curr.betCount, 0)).to.equal(4);
      expect(gameProgressPlayerGame.reduce((prev, curr) => prev + curr.betAmount, 0)).to.equal(60);
    });

    it('concurrency test for 50 simultaneous bet events for 5 users', async () => {
      const playerIds = [1, 2, 3, 4, 5];
      const permalinks = ['bookofdead', 'firejoker'];
      const betAmounts = [10, 15, 20, 25, 30];
      const bets: WageringEvent[] = [];
      playerIds.map(pId => permalinks.map(permalink => betAmounts.map(b => bets.push({
        playerId: pId,
        brandId: 'KK',
        permalink,
        bet: b,
        win: 0,
        promotions: [],
      }))));

      await Promise.all(bets.map(b => handleBetEvent(pg, b)));

      const progresses = await pg('progresses');

      playerIds.map((pid) => {
        const playerProgresses = progresses.filter(p => p.playerId === pid);
        const incompletePlayerProgresses = playerProgresses.filter(p => p.completedAt === null);
        expect(playerProgresses.length).to.equal(3);
        expect(incompletePlayerProgresses.length).to.equal(1);
        expect(incompletePlayerProgresses[0].contribution).to.equal(0);
        expect(incompletePlayerProgresses[0].perRewardDefinitionCount).to.equal(3);
        return incompletePlayerProgresses;
      });
    });
  });

  after(async () => {
    await pg('progresses_rewards').del();
    await pg('game_progresses').del();
    await pg('progresses').del();
    await pg('ledgers').del();
    await pg('rewards')
      .whereIn('id', rs)
      .del();
    await pg('reward_definitions')
      .whereIn('id', rds)
      .del();
  });
});

describe('eventHandlers markka', () => {
  let rewardDefinitionId;
  let rewardId;
  const bet: WageringEvent = {
    playerId: 123,
    brandId: 'KK',
    permalink: 'bookofdead',
    bet: 12,
    win: 0,
    promotions: [
      { name: 'money', value: 720, contribution: 12 },
    ],
  };
  const expectedProgresses = [
    {
      target: 20000,
      betCount: 1,
      contribution: 10012,
      cumulativeContribution: 720,
    },
  ];
  let progresses;
  let gameProgresses;
  let progressesRewards;
  before(async () => {
    await pg('games').insert(games);
    rewardDefinitionId = (await createRewardDefinition(pg, { rewardType: 'markka', brandId: 'KK', promotion: 'money', followUpdates: true })).id;

    rewardId = (await upsertReward(pg, { rewardDefinitionId, bonusCode: 'Some code4', creditType: 'markka', description: '', externalId: 'Markka', order: 1 })).id;
  });

  after(cleanDb);

  it('creates first level markka reward with 50% full target and cumulativeContribution from "value"', async () => {
    await handleBetEvent(pg, bet);

    progresses = await pg('progresses');
    expect(progresses).to.deep.containSubset(expectedProgresses);

    progressesRewards = await pg('progresses_rewards').where({ progressId: progresses[0].id });
    expect(progressesRewards.length).to.equal(5);
    expect(progressesRewards[0].rewardId).to.equal(rewardId);

    gameProgresses = await pg('game_progresses').where({ progressId: progresses[0].id });
    expect(gameProgresses.length).to.equal(1);
    expect(gameProgresses[0].betCount).to.equal(1);
    expect(gameProgresses[0].betAmount).to.equal(12);
  });

  it('do not repeat bet', async () => {
    await handleBetEvent(pg, bet);

    expect(await pg('progresses')).to.deep.equal(progresses);
    expect(await pg('progresses_rewards').where({ progressId: progresses[0].id })).to.deep.equal(progressesRewards);
    expect(await pg('game_progresses').where({ progressId: progresses[0].id })).to.deep.equal(gameProgresses);
  });

  it('handles bet without game', async () => {
    await pg('game_progresses').del();
    await pg('progresses_rewards').del();
    await pg('progresses').del();
    await pg('games').del();

    await handleBetEvent(pg, bet);

    progresses = await pg('progresses');
    expect(progresses).to.deep.containSubset(expectedProgresses);
    expect((await pg('game_progresses')).length).to.equal(0);
  });

  it('do not follow promotions with "followUpdates" false', async () => {
    await pg('progresses_rewards').del();
    await pg('progresses').del();
    await pg('reward_definitions').update({ followUpdates: false }).where({ id: rewardDefinitionId });

    await handleBetEvent(pg, bet);

    expect((await pg('progresses')).length).to.equal(0);
    expect((await pg('game_progresses')).length).to.equal(0);
  })
});
