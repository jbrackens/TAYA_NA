/* @flow */
const { DateTime } = require('luxon');
const moment = require('moment-timezone');
const proxyquire = require('proxyquire');

const pg = require('gstech-core/modules/pg');

const cleanDb = require('../../../jobs/cleanData');
const { upsertReward } = require('../rewards/Rewards');
const { createRewardDefinition } = require('../reward-definitions/RewardDefinitions');
const { games } = require('../../mockData');

const Ledgers = proxyquire('./Ledgers', {
  '../rewards/Rewards': proxyquire('../rewards/Rewards', {
    './wheelSpinWeights': [{ id: 'w2', weight: 1 }],
  }),
});

describe('Ledgers', () => {
  let KKCoinRD;
  let OSCoinRD;
  let CJWheelSpinRD;
  let CJWheelSpinContentRD;
  let KKCoinR;
  let OSCoinR;
  let CJWheelSpinR;
  let ledgerId;
  let ledgerDraft;
  const expires = moment().subtract(1, 'day').toDate();
  const playerId = 555444;

  before(async () => {
    await pg('games').insert(games);
    KKCoinRD = await createRewardDefinition(pg, {
      rewardType: 'markka',
      brandId: 'KK',
      promotion: '',
    });
    OSCoinRD = await createRewardDefinition(pg, {
      rewardType: 'iron',
      brandId: 'OS',
      promotion: '',
    });
    CJWheelSpinRD = await createRewardDefinition(pg, {
      rewardType: 'wheelSpin',
      brandId: 'CJ',
      promotion: '',
    });
    CJWheelSpinContentRD = await createRewardDefinition(pg, {
      rewardType: 'wheelSpinContent',
      brandId: 'CJ',
      promotion: '',
    });
    KKCoinR = await upsertReward(pg, {
      bonusCode: '',
      creditType: 'markka',
      externalId: 'Markka',
      rewardDefinitionId: KKCoinRD.id,
      order: 1,
      description: '',
    });
    OSCoinR = await upsertReward(pg, {
      bonusCode: '',
      creditType: 'iron',
      externalId: 'IronCoin',
      rewardDefinitionId: OSCoinRD.id,
      order: 2,
      description: '',
    });
    CJWheelSpinR = await upsertReward(pg, {
      bonusCode: '',
      creditType: 'wheelSpin',
      externalId: 'wheelSpin',
      rewardDefinitionId: CJWheelSpinRD.id,
      order: 3,
      description: '',
    });
    await upsertReward(pg, {
      bonusCode: '',
      creditType: 'freeSpins',
      externalId: 'w1',
      rewardDefinitionId: CJWheelSpinContentRD.id,
      order: 2,
      description: '',
      gameId: games[0].id,
      spins: 10,
    });
    await upsertReward(pg, {
      bonusCode: '',
      creditType: 'freeSpins',
      externalId: 'w2',
      rewardDefinitionId: CJWheelSpinContentRD.id,
      order: 3,
      description: '',
      gameId: games[0].id,
      spins: 20,
    });

    ledgerDraft = {
      rewardId: CJWheelSpinR.id,
      rewardDefinitionId: CJWheelSpinRD.id,
      playerId,
      creditDate: DateTime.utc().toJSDate(),
      useDate: null,
      externalId: null,
      source: 'wagering',
    };
  });

  after(cleanDb);

  describe('createLedger', () => {
    it('can create', async () => {
      const ledger = await Ledgers.createLedger(pg, ledgerDraft);
      ledgerId = ledger.id;

      expect(ledger).to.containSubset(ledgerDraft);
      expect(ledger.groupId).to.be.a('number');
      expect(moment(ledger.expires) > moment().add(89, 'days')).to.equal(true);
    });
  });

  describe('getLedgers', () => {
    it('can get unused with events', async () => {
      await pg('ledgers_events').insert({ ledgerId, event: 'event' });
      const ledgers = await Ledgers.getLedgers(pg, playerId, { includeEvents: true });

      expect(ledgers.length).to.equal(1);
      expect(ledgers).to.containSubset([
        {
          id: ledgers[0].id,
          reward: CJWheelSpinR,
          game: null,
          result: null,
          events: [{ ledgerId: Number(ledgerId), event: 'event' }],
        },
      ]);
    });

    it('skip expired ledgers', async () => {
      await Ledgers.createLedger(pg, { ...ledgerDraft, expires });

      const ledgers = await Ledgers.getLedgers(pg, playerId);

      expect(ledgers.length).to.equal(1);
    });

    it('can use pagination properly', async () => {
      await pg.transaction((tx) =>
        Promise.all(
          [...Array(10)].map(() => Ledgers.createLedger(tx, { ...ledgerDraft, playerId: 100 })),
        ),
      );

      const ledgers = await Ledgers.getLedgers(pg, 100, { pageSize: 4, pageIndex: 2 });

      expect(ledgers.length).to.equal(4);
    });

    it('can get unused ledgers by rewardDefinitionId', async () => {
      const ledgers = await Ledgers.getLedgers(pg, playerId, {
        rewardDefinitionId: CJWheelSpinRD.id,
        excludeExpired: false,
      });

      expect(ledgers).to.deep.containSubset([
        {
          game: null,
          reward: CJWheelSpinR,
          useDate: ledgerDraft.useDate,
        },
        {
          game: null,
          reward: CJWheelSpinR,
          useDate: ledgerDraft.useDate,
          expires,
        },
      ]);
    });
  });

  describe('markLedgersUsed', () => {
    it('can use single ledger', async () => {
      const ledger = await Ledgers.createLedger(pg, ledgerDraft);

      const returnLedgers = await Ledgers.markLedgersUsed(pg, [ledger.id], playerId);

      expect(returnLedgers).to.deep.containSubset([
        { id: ledger.id, game: null, reward: CJWheelSpinR },
      ]);
    });

    it('can use multiple ledgers', async () => {
      const ledgers = [];
      ledgers.push(await Ledgers.createLedger(pg, ledgerDraft));
      ledgers.push(await Ledgers.createLedger(pg, ledgerDraft));

      const returnLedgers = await Ledgers.markLedgersUsed(
        pg,
        ledgers.map((l) => l.id),
        playerId,
      );

      expect(returnLedgers).to.deep.containSubset(
        ledgers.map((l) => ({ id: l.id, game: null, reward: CJWheelSpinR })),
      );
    });

    it('throws error if any ledger cannot be used', async () => {
      const ledger = await Ledgers.createLedger(pg, ledgerDraft);

      await expect(
        Ledgers.markLedgersUsed(pg, [ledger.id, 1123675123], playerId),
      ).to.be.rejectedWith(
        `markLedgersUsed could not update ledgers ${ledger.id}, 1123675123 properly`,
      );
    });
  });

  describe('getPlayersCoins', () => {
    let kkcoinledger1;
    let kkcoinledger2;

    it('return empty array if no coins', async () => {
      const coins = await Ledgers.getPlayerCoins(pg, 'KK', 2, 'markka');

      expect(coins.length).to.equal(0);
    });

    it('return only brand coins', async () => {
      kkcoinledger1 = await Ledgers.createLedger(pg, {
        playerId: 2,
        rewardId: KKCoinR.id,
        rewardDefinitionId: KKCoinRD.id,
        creditDate: new Date(),
        source: 'wagering',
      });
      await Ledgers.createLedger(pg, {
        playerId: 2,
        rewardId: OSCoinR.id,
        rewardDefinitionId: OSCoinRD.id,
        creditDate: new Date(),
        source: 'wagering',
      });

      const coins = await Ledgers.getPlayerCoins(pg, 'KK', 2, 'markka');

      expect(coins).to.deep.equal([{ ledgerId: kkcoinledger1.id }]);
    });

    it('return all coins', async () => {
      kkcoinledger2 = await Ledgers.createLedger(pg, {
        playerId: 2,
        rewardId: KKCoinR.id,
        rewardDefinitionId: KKCoinRD.id,
        creditDate: new Date(),
        source: 'wagering',
      });

      const coins = await Ledgers.getPlayerCoins(pg, 'KK', 2, 'markka');

      expect(coins).to.deep.equal([{ ledgerId: kkcoinledger1.id }, { ledgerId: kkcoinledger2.id }]);
    });
  });

  describe('getPlayerLedgersCount', () => {
    it('returns ledgers count', async () => {
      const result = await Ledgers.getPlayerLedgersCount(pg, 2);
      expect(result).to.have.deep.members([
        { rewardDefinitionId: KKCoinRD.id, count: 2, rewardType: 'markka' },
        { rewardDefinitionId: OSCoinRD.id, count: 1, rewardType: 'iron' },
      ]);
    });
  });

  describe('usePlayerWheelSpin', () => {
    it('should return an error if a player does not have a wheelSpin available', async () => {
      await pg('ledgers').update({ useDate: new Date() }).where({ rewardId: CJWheelSpinR.id });

      await expect(Ledgers.usePlayerWheelSpin(pg, 'CJ', playerId)).to.be.rejectedWith(
        'Player does not have wheel spins available',
      );
    });

    it('should be able to use available wheelSpin', async () => {
      await pg('ledgers').update({ useDate: null }).where({ id: ledgerId });

      const result = await Ledgers.usePlayerWheelSpin(pg, 'CJ', playerId);
      expect(result.length).to.equal(1);
      expect(result[0]).to.containSubset({
        reward: {
          externalId: 'w2',
        },
        game: {
          id: games[0].id,
        },
      });

      const ledgers = await pg('ledgers').where({ rewardId: CJWheelSpinR.id, useDate: null });
      expect(ledgers.length).to.equal(0);

      const rewardLedgers = await pg('ledgers').where({
        playerId,
        rewardDefinitionId: CJWheelSpinContentRD.id,
      });
      expect(rewardLedgers.length).to.equal(1);
      expect(rewardLedgers[0].source).to.equal('exchange');

      const events = await pg('ledgers_events').where({ ledgerId });
      expect(events).to.containSubset([{
        event: 'wheelSpin-result',
        parameters: {
          externalRewardId: 'w2',
        },
      }]);
    });

    it('works correctly with getLedgers', async () => {
      const ledgers = await Ledgers.getLedgers(pg, playerId, { excludeUsed: false });

      expect(ledgers).to.containSubset([
        { id: ledgerId, reward: { creditType: 'wheelSpin' }, result: 'w2', quantity: 1 },
      ]);
    });
  });

  let groupId1;
  let groupId2;
  let ledgerId2;
  describe('createLedgers', () => {
    let duplicateLedgerId;

    it('should leave externalId as it is for single item', async () => {
      const result = await Ledgers.createLedgers(pg, { ...ledgerDraft, externalId: 'a2' }, 1);

      expect(result.length).to.equal(1);
      expect(result).to.containSubset([{ externalId: 'a2' }]);
      duplicateLedgerId = result[0].id;
    });

    it('returns existing ledgers on conflict', async () => {
      const result = await Ledgers.createLedgers(pg, { ...ledgerDraft, externalId: 'a2' }, 1);

      expect(result[0].id).to.equal(duplicateLedgerId);
    });

    it('should be able to create multiple items without externalId', async () => {
      const result = await Ledgers.createLedgers(pg, { ...ledgerDraft }, 5);

      expect(result.length).to.equal(5);
      groupId1 = result[0].groupId;
    })

    it('should leave first externalId as is and alter subsequent for multiple items', async () => {
      const result = await Ledgers.createLedgers(pg, { ...ledgerDraft, externalId: 'a3' }, 5);
      const { groupId } = result[0];

      expect(result.length).to.equal(5);
      expect(result).to.containSubset([
        { externalId: 'a3', groupId },
        { externalId: 'a3-1', groupId },
        { externalId: 'a3-2', groupId },
        { externalId: 'a3-3', groupId },
        { externalId: 'a3-4', groupId },
      ]);
      groupId2 = groupId;
      ledgerId2 = result[0].id;
    });

    it('works correctly with getLedgers', async () => {
      const result = await Ledgers.getLedgers(pg, playerId);

      expect(result).to.containSubset([
        { externalId: 'a2', quantity: 1 },
        { externalId: null, quantity: 5 },
        { externalId: 'a3', quantity: 5 },
      ]);
    });
  });

  describe('markLedgerGroupUsed', () => {
    it('should mark used all group rewards', async () => {
      const result = await Ledgers.markLedgerGroupUsed(pg, groupId1, playerId);

      expect(result.length).to.equal(5);
      result.map(({ useDate }) => expect(useDate).to.be.a('date'));
      result.map(({ groupId }) => expect(groupId).to.equal(groupId1));
    });

    it('should use partially group and random rewards if some are used', async () => {
      await pg('ledgers').where({ id: ledgerId2 }).update({ useDate: new Date() });

      const result = await Ledgers.markLedgerGroupUsed(pg, groupId2, playerId);

      result.map(({ useDate }) => expect(useDate).to.be.a('date'));
      expect(result.map(({ externalId }) => externalId)).to.have.members(['a2', 'a3-1', 'a3-2', 'a3-3', 'a3-4']);
    });

    it('should throw and error if cannot find enough rewards to mark used', async () => {
      await expect(Ledgers.markLedgerGroupUsed(pg, groupId2, playerId)).to.be.rejectedWith({
        httpCode: 409,
        message: `Not enough ledgers to mark used for group ${groupId2}`,
      });
    });
  });

  describe('getPlayerBalance', () => {
    it('returns player balance', async () => {
      const result = await Ledgers.getPlayerBalance(pg, 2, 'KK');

      expect(result).to.deep.equal({
        markka: {
          rewardDefinitionId: KKCoinRD.id,
          total: 2,
          credited: 2,
          used: 0,
        },
      });
    });
  });
});
