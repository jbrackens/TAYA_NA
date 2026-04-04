/* @flow */
import type {
  Game,
  GameDraft,
  Reward,
  CreditType,
  CasinoCurrency,
} from 'gstech-core/modules/types/rewards';

type Operation = (...args: Array<any>) => Promise<any>;
type OperationsGeneratorFunction = (...args: Array<any>) => Promise<Array<Operation>>;

const { Command, Argument } = require('commander');
const promiseLimit = require('promise-limit');
const _ = require('lodash');
const hstore = require('pg-hstore')();
const pg = require('gstech-core/modules/pg');
const money = require('gstech-core/modules/money');
const logger = require('gstech-core/modules/logger');
const { DateTime } = require('luxon');
const { hstoreFromArray } = require('gstech-core/modules/utils');
// $FlowIgnore
const oss = require('../../gstech-walletserver/server/modules/evo-oss/oss');
const { getGameByPermalink, deleteGame } = require('../server/modules/games/Games');
const { deleteReward, createReward } = require('../server/modules/rewards/Rewards');
const { existingGames, missingGames } = require('./assets/27-evo-oss-migration-data.json');
const tableIdsNeedFixing = require('./assets/27-fix-table-ids.json');
const existingEvoGames = require('./assets/27-existing-evolution-games-migration-data.json');

const TEST_SUBSETS = [
  ['turnyourfortune', 'hotline2', 'divinefortune'],
  ['vegasnightlife', 'twinspinmegaways', 'bloodsuckers'],
  ['jumanji', 'dazzleme', 'finn'],
  ['gorillakingdom', 'fruitshop', 'starburst'],
  ['riseofmaya', 'aloha'],
  ['steamtower'],
];

// region helper functions
// Replacing an exising game that will inherit its order, foregoing the need to re-order
const recreateGame = async (
  knex: Knex,
  gameId: Id,
  recreatedGame: GameDraft,
): Promise<Array<Game>> => {
  const { tags, ...gameDraft } = recreatedGame;
  await knex('games').update({ removedAt: new Date() }).where({ removedAt: null, id: gameId });
  return await knex('games')
    .insert({
      ...gameDraft,
      tags: hstoreFromArray((_.isArray(tags || []) ? tags : _.keys(hstore.parse(tags))) || []),
    })
    .returning('*');
};

const getRewardsForGameId = async (knex: Knex, gameId: Id): Promise<Reward[]> =>
  knex('rewards').select('*').where({ gameId, removedAt: null });

const setupEvoCampaignForReward = async (
  tableId: any,
  evoBetAmounts: Array<number>,
  reward: {
    active?: boolean,
    bonusCode: string,
    cost: Money,
    creditType: CreditType,
    currency?: ?CasinoCurrency,
    description: string,
    externalId: string,
    gameId?: ?Id,
    id: Id,
    metadata: { [key: string]: any },
    order: number,
    price?: ?number,
    removedAt?: ?Date,
    rewardDefinitionId: Id,
    spinType?: ?string,
    spinValue?: ?Money,
    spins?: ?number,
    validity?: ?number,
  },
) => {
  const { id: oldRewardId, metadata, spinType, spinValue, ...rewardDraft } = reward;
  let crossRefVal;
  let newSpinValue;
  if (spinValue) crossRefVal = spinValue;
  else
    switch (spinType) {
      case 'ms':
      case 'x10':
      case 'mega':
        crossRefVal = 100;
        break;
      case 'ss':
      case 'x5':
      case 'super':
        crossRefVal = 50;
        break;
      case 'x1':
      case 'normal':
        crossRefVal = 10;
        break;
      default:
        crossRefVal = 10; // normal spins
    }
  const crossRefMoneyVal = +money.asFloat(crossRefVal);
  if (!_.includes(evoBetAmounts, crossRefMoneyVal)) {
    newSpinValue = _.minBy(evoBetAmounts, (evoBetAmount) =>
      Math.abs(evoBetAmount - crossRefMoneyVal),
    );
    logger.warn(`BET:WARN ${tableId} ${crossRefMoneyVal} not available, using ${newSpinValue}.`);
  } else {
    newSpinValue = crossRefMoneyVal;
  }
  logger.info(`BET:OK ${tableId} ${crossRefMoneyVal} available.`);

  const intervalStart = new Date();
  const intervalEnd = DateTime.fromJSDate(intervalStart).plus({ years: 15 }).toJSDate();
  const {
    pk: { campaignId },
  } = await oss.createCampaign({
    title: rewardDraft.bonusCode,
    timezone: 'Europe/Malta',
    campaignInterval: {
      start: intervalStart,
      end: intervalEnd,
    },
    tableSettings: {
      forAll: {
        tableIds: [tableId],
        $type: 'ParticularTables',
      },
      forDesktopOnly: { $type: 'Non' },
      forMobileOnly: { $type: 'Non' },
    },
    sites: { $type: 'All' },
    expirationDuration: 'P90D',
  });
  return { campaignId, spinValue: money.parseMoney(newSpinValue) };
};
// endregion

// region Script Action Functions
const removeMissingGames: OperationsGeneratorFunction = async (target) => {
  const ops = [];
  const getExclusivelyMissingGames = (m: any, e: any, t: any) =>
    _.chain(m)
      .filter(
        (i) => i.gstech.manufacturerId === t && !_.find(e, (j) => _.isEqual(i.reward, j.reward)),
      )
      .value();
  for (const { reward: r } of getExclusivelyMissingGames(missingGames, existingGames, target)) {
    ops.push(async (reward: any = r): Promise<any> => {
      try {
        return await pg.transaction(async (tx): Promise<?string> => {
          const { permalink, brandId } = reward;
          const missingGameData = await tx('games')
            .first()
            .where({ permalink, brandId })
            .whereNot({ manufacturer: 'Evolution' });
          if (!missingGameData) {
            logger.error(`No game with permalink '${permalink}' found for brand '${brandId}'`);
            return `NF:${permalink}`;
          }
          if (missingGameData.removedAt != null) {
            logger.info(`Permalink '${permalink}' for brand '${brandId}' already deleted.`);
            return `OK:${permalink}`;
          }
          await deleteGame(tx, missingGameData.id);
          return `OK:${permalink}`;
        });
      } catch (err) {
        logger.error(`ERR: ${reward.permalink} ${err.message}`, { error: err, reward });
        return `ERR:${reward.brandId}-${reward.permalink} ${err.message}`;
      }
    });
  }
  return ops;
};

const migrateExistingGames: OperationsGeneratorFunction = async (target, testSubset, force) => {
  const ops = [];
  let existing = _.filter(existingGames, ['gstech.manufacturerId', target]);
  if (testSubset) {
    const selectSubsets = _.flatten<string, string, string>(
      _.map(testSubset, (i) => TEST_SUBSETS[i - 1]),
    );
    existing = _.filter(existing, ({ reward: { permalink } }) => selectSubsets.includes(permalink));
  }
  if (force) {
    existing = _.uniqBy(
      existing,
      ({ reward: { permalink, brandId } }) => `${permalink}-${brandId}`,
    );
  }
  for (const { reward: r, evo: e } of existing) {
    ops.push(async (reward: any = r, evo: any = e): Promise<any> => {
      try {
        return await pg.transaction(async (tx): Promise<?string> => {
          const { permalink, brandId } = reward;
          const currentGameData = await getGameByPermalink(tx, permalink, brandId);
          if (!currentGameData) {
            logger.error(`No game with permalink '${permalink}' found for brand '${brandId}'`);
            return `NF:${permalink}`;
          }
          if (!force && currentGameData.manufacturer === 'Evolution') {
            logger.info(`Permalink '${permalink}' for brand '${brandId}' already migrated.`);
            return `OK:${permalink}`;
          }

          const { id: gameId, ...game } = currentGameData;
          const { csv, api } = evo;
          const hasJackpot =
            csv.feature.includes('local jackpot') || csv.feature.includes('global jackpot');
          const evoGame = {
            ...game,
            name: csv.gameTypeName,
            primaryCategory:
              { slots: 'VideoSlot', rng: 'TableGame' }[api.gameVertical] || game.primaryCategory,
            parameters: {
              tableId: csv.tableId,
            },
            manufacturer: 'Evolution',
            keywords: { NE: 'netent', RTG: 'redtigergames' }[target],
            jackpot: hasJackpot,
            active: !hasJackpot,
          };
          const [newGame] = await recreateGame(tx, gameId, evoGame);
          const { id: newGameId } = newGame;
          const oldRewards = await getRewardsForGameId(tx, gameId);
          if (oldRewards.length > 0) {
            const evoBetAmounts = await oss.getTableBetAmounts('EUR', {
              forAll: {
                tableIds: [csv.tableId],
                $type: 'ParticularTables',
              },
              forDesktopOnly: { $type: 'Non' },
              forMobileOnly: { $type: 'Non' },
              sites: { $type: 'All' },
            });
            for (const oldReward of oldRewards) {
              const { id: oldRewardId, metadata, spinType, spinValue, ...rewardDraft } = oldReward;

              let crossRefVal;
              let newSpinValue;
              if (spinValue) crossRefVal = spinValue;
              else
                switch (spinType) {
                  case 'ms':
                  case 'x10':
                  case 'mega':
                    crossRefVal = 100;
                    break;
                  case 'ss':
                  case 'x5':
                  case 'super':
                    crossRefVal = 50;
                    break;
                  case 'x1':
                  case 'normal':
                    crossRefVal = 10;
                    break;
                  default:
                    crossRefVal = 10; // normal spins
                }
              const crossRefMoneyVal = +money.asFloat(crossRefVal);
              if (!_.includes(evoBetAmounts, crossRefMoneyVal)) {
                newSpinValue = _.minBy(evoBetAmounts, (evoBetAmount) =>
                  Math.abs(evoBetAmount - crossRefMoneyVal),
                );
                logger.warn(
                  `BET:WARN ${csv.tableId} ${crossRefMoneyVal} not available, using ${newSpinValue}.`,
                );
              } else {
                newSpinValue = crossRefMoneyVal;
              }
              logger.info(`BET:OK ${csv.tableId} ${crossRefMoneyVal} available.`);

              const intervalStart = new Date();
              const intervalEnd = DateTime.fromJSDate(intervalStart).plus({ years: 15 }).toJSDate();
              const {
                pk: { campaignId },
              } = await oss.createCampaign({
                title: rewardDraft.bonusCode,
                timezone: 'Europe/Malta',
                campaignInterval: {
                  start: intervalStart,
                  end: intervalEnd,
                },
                tableSettings: {
                  forAll: {
                    tableIds: [csv.tableId],
                    $type: 'ParticularTables',
                  },
                  forDesktopOnly: { $type: 'Non' },
                  forMobileOnly: { $type: 'Non' },
                },
                sites: { $type: 'All' },
                expirationDuration: 'P90D',
              });
              await oss.launchCampaign(campaignId);
              await deleteReward(tx, oldRewardId);
              await createReward(tx, {
                ...rewardDraft,
                spinType,
                spinValue: money.parseMoney(newSpinValue),
                gameId: newGameId,
                metadata: { ...metadata, campaignId },
              });
            }
          }
          return `OK:${permalink}`;
        });
      } catch (err) {
        logger.error(`ERR: ${e.csv.providerGameId} ${err.message}`, { error: err, evo: e.csv });
        return `ERR:${r.permalink}`;
      }
    });
  }
  return ops;
};

const updateExistingEvolutionGames: OperationsGeneratorFunction = async () => {
  const ops = [];
  for (const { reward: r, evo: e } of existingEvoGames) {
    ops.push(async (reward: any = r, evo: any = e): Promise<any> => {
      try {
        return await pg.transaction(async (tx): Promise<?string> => {
          const { permalink, brandId } = reward;
          const currentGameData = await getGameByPermalink(tx, permalink, brandId);
          if (!currentGameData) {
            logger.error(`No game with permalink '${permalink}' found for brand '${brandId}'`);
            return `NF:${permalink}`;
          }
          const { id: gameId, ...game } = currentGameData;
          const { csv } = evo;
          const evoGame = {
            ...game,
            name: csv.tableName,
            primaryCategory:
              { slots: 'VideoSlot', rng: 'TableGame', live: 'Live' }[csv.gameVertical] ||
              game.primaryCategory,
            parameters: { tableId: csv.tableId },
            manufacturer: 'Evolution',
            keywords: csv?.feature?.join(' '),
          };
          await recreateGame(tx, gameId, evoGame);
          return `OK:${permalink}`;
        });
      } catch (err) {
        logger.error(`ERR: ${e.csv.providerGameId} ${err.message}`, { error: err, evo: e.csv });
        return `ERR:${r.permalink}`;
      }
    });
  }
  return ops;
};

const testOSSRewardsApi: OperationsGeneratorFunction = async () => {
  const ops = [];
  ops.push(async () => {
    try {
      const campaigns = await oss.getAllCampaigns();
      return `OK:${campaigns.length}`;
    } catch (e) {
      logger.error(`ERR: ${e.message}`, { error: e });
      return `ERR:${e.message}`;
    }
  });
  return ops;
};

const tagGamesWithKeyword: OperationsGeneratorFunction = async (target, testSubset) => {
  const ops = [];
  let existing = _.filter(existingGames, ['gstech.manufacturerId', target]);
  if (testSubset)
    existing = _.filter(existing, ({ reward: { permalink } }) =>
      TEST_SUBSETS[testSubset - 1].includes(permalink),
    );
  for (const { reward: r, evo: e } of existing) {
    ops.push(async (reward: any = r): Promise<any> => {
      try {
        return await pg.transaction(async (tx): Promise<?string> => {
          const { permalink, brandId } = reward;
          const currentGameData = await getGameByPermalink(tx, permalink, brandId);
          if (!currentGameData) {
            logger.error(`No game with permalink '${permalink}' found for brand '${brandId}'`);
            return `NF:${permalink}`;
          }
          const { id: gameId, keywords } = currentGameData;
          const keywordToAdd = target === 'NE' ? 'netent' : 'red tiger';
          if (keywords && keywords.includes(keywordToAdd)) return `OK:${permalink}`;
          await tx('games')
            .update({ keywords: `${keywordToAdd} ${keywords || ''}`.trim() }, ['*'])
            .where({ id: gameId, removedAt: null });
          return `OK:${permalink}`;
        });
      } catch (err) {
        logger.error(`ERR: ${e.csv.providerGameId} ${err.message}`, { error: err, evo: e.csv });
        return `ERR:${r.permalink}`;
      }
    });
  }
  return ops;
};

const verifyTableIdInParameters: OperationsGeneratorFunction = async (target) => {
  const ops = [];
  const existing = _.filter(existingGames, ['gstech.manufacturerId', target]);
  for (const { reward: r, evo: e } of existing) {
    ops.push(async (reward: any = r, evo: any = e): Promise<any> => {
      try {
        return await pg.transaction(async (tx): Promise<?string> => {
          const { permalink, brandId } = reward;
          const {
            csv: { tableId },
          } = evo;
          const migratedGame = await getGameByPermalink(tx, permalink, brandId);
          if (!migratedGame) return `NF:${permalink}`;
          const migratedParameters = _.get(migratedGame, 'parameters', {});
          if (migratedParameters && !migratedParameters.tableId) {
            await tx('games')
              .update({ parameters: { ...migratedParameters, tableId } }, ['*'])
              .where({ id: migratedGame.id });
          }
          return `OK:${permalink}`;
        });
      } catch (err) {
        logger.error(`ERR: ${e.csv.providerGameId} ${err.message}`, { error: err, evo: e.csv });
        return `ERR:${r.permalink}`;
      }
    });
  }
  return ops;
};

const fixTableIds: OperationsGeneratorFunction = async () => {
  const ops = [];
  for (const ftid of tableIdsNeedFixing) {
    ops.push(async (fixTableId: any = ftid): Promise<any> => {
      try {
        return await pg.transaction(async (tx): Promise<?string> => {
          const { permalink, targetTableId } = fixTableId;
          const currentGames = await tx('games').where({
            permalink,
            removedAt: null,
            manufacturer: 'Evolution',
          });
          for (const { id, brandId, parameters } of currentGames) {
            logger.info(`${brandId}-${permalink} (${id}) -> ${targetTableId}`);
            await tx('games')
              .update({ parameters: { ...parameters, tableId: targetTableId } }, ['*'])
              .where({ id });
          }
          return `OK:${permalink}`;
        });
      } catch (err) {
        return `ERR:${ftid.id}-${ftid.bonusCode}`;
      }
    });
  }
  return ops;
};

const changeTableIds: OperationsGeneratorFunction = async (changeTables, recycleCampaigns) => {
  logger.debug('changeTableIds', { changeTables, recycleCampaigns });
  const preExistingEvoCampaigns = recycleCampaigns ? await oss.getAllCampaigns() : [];
  return _.map(changeTables, (c) => {
    const [currTableId, newTableId] = c.split('->');
    return { currTableId, newTableId };
  }).map(
    ({ currTableId, newTableId }) =>
      async (cTid = currTableId, nTid = newTableId): Promise<any> => {
        try {
          return await pg.transaction(async (tx): Promise<?string> => {
            const currentGames = await tx('games')
              .whereRaw(`parameters->>'tableId' = '${cTid}'`)
              .where({ removedAt: null, manufacturer: 'Evolution' });
            for (const { id, brandId, parameters, permalink } of currentGames) {
              logger.info(`${brandId}-${permalink} (${id}) -> ${nTid}`);
              await tx('games')
                .update({ parameters: { ...parameters, tableId: nTid } }, ['*'])
                .where({ id });
              const rewards = await getRewardsForGameId(tx, id);
              if (rewards.length > 0) {
                const evoBetAmounts = await oss.getTableBetAmounts('EUR', {
                  forAll: {
                    tableIds: [nTid],
                    $type: 'ParticularTables',
                  },
                  forDesktopOnly: { $type: 'Non' },
                  forMobileOnly: { $type: 'Non' },
                  sites: { $type: 'All' },
                });
                for (const reward of rewards) {
                  let campaignId;
                  let spinValue;
                  const [preExistingEvoCampaign] = _.filter(preExistingEvoCampaigns, (camp) => {
                    if (camp.payload.info.tableSettings.forAll.$type === 'Non') return false;
                    const {
                      payload: {
                        state,
                        info: {
                          title,
                          tableSettings: {
                            forAll: { tableIds: preExistingTableIds },
                          },
                        },
                      },
                    } = camp;
                    return (
                      state === 'Active' &&
                      preExistingTableIds.includes(nTid) &&
                      title === reward.bonusCode
                    );
                  });
                  if (preExistingEvoCampaign) {
                    campaignId = preExistingEvoCampaign.pk.campaignId;
                    spinValue = reward.spinValue;
                  } else {
                    const newEvoCampaign = await setupEvoCampaignForReward(
                      nTid,
                      evoBetAmounts,
                      reward,
                    );
                    campaignId = newEvoCampaign.campaignId;
                    spinValue = newEvoCampaign.spinValue;
                    await oss.launchCampaign(campaignId);
                  }
                  const { id: rewardId, metadata, ...rewardRest } = reward;
                  await tx('rewards')
                    .update({ ...rewardRest, spinValue, metadata: { ...metadata, campaignId } }, [
                      '*',
                    ])
                    .where({ id: rewardId });
                }
              }
            }
            return `OK:${cTid}`;
          });
        } catch (err) {
          logger.error(err);
          return `ERR:${cTid}`;
        }
      },
  );
};
// endregion

// region CLI setup
const program = new Command();

const main = async (
  operationsFn: OperationsGeneratorFunction,
  target: any | null,
  { plimit, subsets, changeTables, force, recycle: recycleCampaigns }: any,
) => {
  let operations;
  const groupOperationResults = (opR: Array<<T = any>(p: Promise<T> | T) => T>) =>
    _.chain(opR)
      .map((s) => s.split(':'))
      .groupBy((a) => a[0])
      .mapValues((a) => _.map(a, (b) => b[1]))
      .value();
  const limit = promiseLimit(plimit);

  if (!target && changeTables) {
    operations = await operationsFn(changeTables, recycleCampaigns);
  } else {
    operations = await operationsFn(target, subsets, force);
  }
  const results = groupOperationResults(
    await Promise.all(operations.map((operation) => limit(() => operation()))),
  );
  const summary = { ok: results.OK?.length, err: results.ERR, nf: results.NF };
  logger.info('Done', { summary, results });
  process.exit(0);
};

program
  .command('migrate')
  .description('Migrate games to Evolution-OSS')
  .addArgument(
    new Argument('target', 'Which game provider to target for migration').choices([
      'NE',
      'RTG',
      'EVO',
    ]),
  )
  .option('--force', 'Force migration, even if an existing migrated game exists', false)
  .option('--plimit <plimit>', 'Set promise-limit value.', 1)
  .option('--subsets <subsets...>', `Migrate only test subset [1..${TEST_SUBSETS.length + 1}]`, 0)
  .action(async (target, options) =>
    main(target === 'EVO' ? updateExistingEvolutionGames : migrateExistingGames, target, options),
  );

program
  .command('archive')
  .description('Archive games unsupported by Evolution-OSS')
  .addArgument(
    new Argument('target', 'Which game provider to target for archiving').choices(['NE', 'RTG']),
  )
  .option('--plimit <plimit>', 'Set promise-limit value.', 1)
  .action(async (target, options) => main(removeMissingGames, target, options));

program
  .command('testoss')
  .description('Test availability of OSS Rewards API')
  .option('--plimit <plimit>', 'Set promise-limit value.', 1)
  .action(async (target, options) => main(testOSSRewardsApi, target, options));

program
  .command('keyword')
  .description('Add previous provider keyword to game keywords')
  .addArgument(new Argument('target', 'Which previous provider to target').choices(['NE', 'RTG']))
  .option('--plimit <plimit>', 'Set promise-limit value.', 1)
  .action(async (target, options) => main(tagGamesWithKeyword, target, options));

program
  .command('verifyTableId')
  .description('Go through migrated games and ensure tableId parameter is set')
  .addArgument(new Argument('target', 'Which previous provider to target').choices(['NE', 'RTG']))
  .option('--plimit <plimit>', 'Set promise-limit value.', 1)
  .action(async (target, options) => main(verifyTableIdInParameters, target, options));

program
  .command('listEvoCampaigns')
  .description('Generate list of campaigns from Evolution OSS and their active TableIds')
  .action(async () => oss.getAllCampaigns());

program
  .command('fixTableIds')
  .description('Fix tableIds that are not matching with idefix games/evolution campaigns')
  .option('--plimit <plimit>', 'Set promise-limit value.', 1)
  .action(async (target, options) => main(fixTableIds, target, options));

program
  .command('changeTableIds')
  .description('Change tableId of a EVO games')
  .addArgument(new Argument('<changeTables...>', `EVO tableIds to change '<old>-><new>'`))
  .option('--plimit <plimit>', 'Set promise-limit value.', 1)
  .option('--no-recycle', 'Force creating new EVO campaigns for rewards', false)
  .action(async (changeTables, options) =>
    main(changeTableIds, null, { ...options, changeTables }),
  );

program.on('*', (o) => logger.error('Invalid command:', o));
program.parse(process.argv);
// endregion
