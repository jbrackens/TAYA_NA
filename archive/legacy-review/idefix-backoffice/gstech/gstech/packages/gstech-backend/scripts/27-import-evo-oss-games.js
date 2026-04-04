/* @flow */
import type { GameProfile } from '../server/modules/games/Game';

type Operation = (...args: Array<any>) => Promise<any>;
type OperationsGeneratorFunction = (...args?: Array<any>) => Promise<Array<Operation>>;

const { Command, Argument } = require('commander');
const _ = require('lodash');
const promiseLimit = require('promise-limit');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const {
  update: updateGame,
  create: createGame,
  upsertProfile,
} = require('../server/modules/games/Game');
const { existingGames, missingGames } = require('./assets/27-evo-oss-migration-data.json');
const tableIdsNeedFixing = require('./assets/27-fix-table-ids.json');
const existingEvoGames = require('./assets/27-existing-evolution-games-migration-data.json');

const TEST_SUBSETS = [
  ['turnyourfortune', 'hotline2', 'divinefortune'],
  ['vegasnightlife', 'twinspinmegaways', 'bloodsuckers'],
  ['jumanji', 'dazzleme', 'finn'],
  ['gorillakingdom', 'fruitshop', 'starburst'],
  ['riseofmaya', 'aloha'],
];

// region helper functions
const getUniqManufacturerGameIds = (m: any, t: any | string) =>
  _.chain(m)
    .filter((i) => i.gstech.manufacturerId === t)
    .uniqBy('gstech.manufacturerGameId')
    .value();

const getGameData = (
  whereClause: {
    manufacturerGameId?: string,
    gameId?: string,
    manufacturerId?: string,
  },
  {
    inclArchived,
    withProfilesOnly,
    first = true,
  }: {
    inclArchived?: boolean,
    withProfilesOnly?: boolean,
    first?: boolean,
  },
  tx?: Knex$Transaction<any>,
): Promise<Array<any>> =>
  (tx || pg)('games')
    .select({
      id: 'games.id',
      gameId: 'games.gameId',
      manufacturerId: 'games.manufacturerId',
      manufacturerGameId: 'games.manufacturerGameId',
      mobileGame: 'games.mobileGame',
      playForFun: 'games.playForFun',
      rtp: 'games.rtp',
      parameters: 'games.parameters',
      permalink: 'games.permalink',
      archived: 'games.archived',
      gameProfiles: pg.raw(`
        COALESCE(
          json_agg(
            json_build_object(
              'id', "game_profiles".id,
              'name', "game_profiles".name,
              'brandId', "brand_game_profiles"."brandId",
              'wageringMultiplier', "game_profiles"."wageringMultiplier",
              'riskProfile', "game_profiles"."riskProfile"
            )
          ) FILTER (WHERE "game_profiles".id IS NOT NULL),
          '[]'
        )
      `),
    })
    .modify((qb) => {
      if (withProfilesOnly) {
        qb.innerJoin('brand_game_profiles', { 'games.id': 'brand_game_profiles.gameId' }).innerJoin(
          'game_profiles',
          'brand_game_profiles.gameProfileId',
          'game_profiles.id',
        );
      } else {
        qb.leftJoin('brand_game_profiles', { 'games.id': 'brand_game_profiles.gameId' }).leftJoin(
          'game_profiles',
          'brand_game_profiles.gameProfileId',
          'game_profiles.id',
        );
      }
    })
    .where(_.mapKeys(whereClause, (v, k) => (k === 'gameId' ? 'games.gameId' : k)))
    .modify((qb) => (inclArchived ? qb : qb.where({ archived: false })))
    .modify((qb) => (first ? qb.limit(1) : qb))
    .groupBy('games.id');

// const removeGame = async (id: Id, tx?: Knex$Transaction<any>) =>
//   (tx || pg)('games').where({ id }).del().debug();

// const removeGameProfile = async (
//   gameId: Id,
//   brandId: string,
//   gameProfileId: Id,
//   tx?: Knex$Transaction<any>,
// ) => (tx || pg)('brand_game_profiles').where({ gameId, brandId, gameProfileId }).del();

const getBrandProfile = (
  brandId: string,
  profileName: string,
  tx?: Knex$Transaction<any>,
): Promise<GameProfile> =>
  (tx || pg)('game_profiles').first().where({ brandId, name: profileName });

const enableGameManufacturer = (gameManufacturerId: string, tx?: Knex$Transaction<any>) =>
  (tx || pg)('game_manufacturers').update({ active: true }).where({ id: gameManufacturerId });

const disableGameManufacturer = (gameManufacturerId: string, tx?: Knex$Transaction<any>) =>
  (tx || pg)('game_manufacturers').update({ active: false }).where({ id: gameManufacturerId });

const enableGame = (id: Id, tx?: Knex$Transaction<any>) =>
  (tx || pg)('games').update({ archived: false }).where({ id });

const disableGame = (id: Id, tx?: Knex$Transaction<any>) =>
  (tx || pg)('games').update({ archived: true }).where({ id });
// endregion

// region Script Action Functions
const archiveMissingGames: OperationsGeneratorFunction = async (target) => {
  const ops = [];
  for (const { gstech: g } of getUniqManufacturerGameIds(missingGames, target)) {
    ops.push(async (gstech: any = g): Promise<any> => {
      try {
        return await pg.transaction(async (tx): Promise<?string> => {
          const { manufacturerGameId } = gstech;
          const [missingGameData] = await getGameData(
            { manufacturerGameId },
            { inclArchived: true },
            tx,
          );
          if (!missingGameData) {
            logger.warn(`No results for: '${manufacturerGameId}'`);
            return `NF:${manufacturerGameId}`;
          }
          if (missingGameData.archived === true) {
            logger.debug(`Game '${manufacturerGameId}' already archived`);
            return `OK:${manufacturerGameId}`;
          }
          logger.debug('Archiving missing game', { missingGameData });
          const { id: gameId } = missingGameData;
          await updateGame(gameId, ({ archived: true }: any), tx);
          return `OK:${manufacturerGameId}`;
        });
      } catch (err) {
        logger.error(`ERR: ${gstech.manufacturerGameId} ${err.message}`, { error: err, gstech });
        return `ERR: ${gstech.manufacturerGameId} ${err.message}`;
      }
    });
  }
  return ops;
};

const migrateExistingGames: OperationsGeneratorFunction = async (target, testSubset, force) => {
  const ops = [];
  let existing = getUniqManufacturerGameIds(existingGames, target);
  if (testSubset) {
    const selectSubsets = _.flatten<string, string, string>(
      _.map(testSubset, (i) => TEST_SUBSETS[i - 1]),
    );
    existing = _.filter(existing, ({ reward: { permalink } }) => selectSubsets.includes(permalink));
  }
  for (const { gstech: g, evo: e } of existing) {
    ops.push(async (gstech: any = g, evo: any = e): Promise<any> => {
      try {
        return await pg.transaction(async (tx): Promise<?string> => {
          const { csv, api, excel } = evo;
          const { manufacturerGameId } = gstech;
          const hasNewManufacturerGameId = manufacturerGameId !== csv.providerGameId;
          const [currentGameData] = await getGameData(
            { manufacturerGameId, manufacturerId: target },
            { inclArchived: true },
            tx,
          );
          if (!currentGameData) {
            logger.warn(`No results for: '${manufacturerGameId}'`);
            return `NF:${manufacturerGameId}`;
          }
          // ignore games without any profiles, we deleted them post first migration attempt
          const mightHaveBeenMigrated =
            hasNewManufacturerGameId &&
            (
              await getGameData(
                { manufacturerGameId: csv.providerGameId },
                { inclArchived: false, withProfilesOnly: hasNewManufacturerGameId },
                tx,
              )
            ).length > 0;
          if (!force && (currentGameData.manufacturerId === 'EVO' || mightHaveBeenMigrated)) {
            logger.info(`Game '${manufacturerGameId}' already migrated`);
            return `OK:${manufacturerGameId}`;
          }

          const { gameProfiles, id: gameId, ...game } = currentGameData;
          const evalRtp = (rtpVal: any) =>
            // eslint-disable-next-line no-nested-ternary
            target === 'RTG' ? 9300 : _.isArray(rtpVal) ? _.max(rtpVal) : rtpVal;
          const evoGame = {
            ...game,
            name: api.gameName,
            manufacturerId: 'EVO',
            manufacturerGameId: csv.providerGameId,
            gameId: `EVO_${csv.tableId}`,
            rtp: evalRtp(csv.rtp) || evalRtp(excel.rtp) || game.rtp,
            archived: false,
          };
          if (!currentGameData.archived) {
            logger.debug('Archiving game', { game });
            await updateGame(gameId, ({ ...game, archived: true }: any), tx);
          }
          logger.debug('Creating new game', { evoGame });
          // First, check if there are leftovers from the previous migration attempt
          const [migratedGame] = await getGameData(
            { gameId: `EVO_${csv.tableId}` },
            { first: true, withProfilesOnly: false },
            tx,
          );
          // we use the migrated game id if it exists, otherwise we create a new one
          const evoGameId = migratedGame ? migratedGame.id : (await createGame(evoGame, tx)).id;
          for (const profile of gameProfiles) {
            const { name, brandId } = profile;
            const profileName = { slots: 'Slots', rng: 'Table Games' }[api.gameVertical] || name;
            logger.debug('Getting brand profile', { brandId, profileName });
            const evoProfile = await getBrandProfile(brandId, profileName, tx);
            logger.debug('Assigning profile', { evoGameId, brandId, evoProfile });
            await upsertProfile(evoGameId, brandId, evoProfile.id, tx);
          }
          return `OK:${manufacturerGameId}`;
        });
      } catch (err) {
        logger.error(`ERR: ${e.csv.providerGameId} ${err.message}`, { error: err, evo: e.csv });
        return `ERR:${e.csv.providerGameId}`;
      }
    });
  }
  return ops;
};

const updateExistingEvolutionGames: OperationsGeneratorFunction = async () => {
  const ops = [];
  for (const { gstech: g, evo: e } of getUniqManufacturerGameIds(existingEvoGames, 'EVO')) {
    ops.push(async (gstech: any = g, evo: any = e): Promise<any> => {
      try {
        return await pg.transaction(async (tx): Promise<?string> => {
          const { manufacturerGameId } = gstech;
          const [currentGameData] = await getGameData(
            { manufacturerGameId },
            { inclArchived: false },
            tx,
          );
          if (!currentGameData) {
            logger.warn(`No results for: '${manufacturerGameId}'`);
            return `NF:${manufacturerGameId}`;
          }

          const { csv } = evo;
          const { gameProfiles, id: gameId, ...game } = currentGameData;
          if (currentGameData.gameId === `EVO_${csv.tableId}`) {
            logger.info(`Game '${manufacturerGameId}' already migrated`);
            return `OK:${manufacturerGameId}`;
          }

          const evalRtp = (rtpVal: any) => (_.isArray(rtpVal) ? _.max(rtpVal) : rtpVal);
          const evoGame = {
            ...game,
            name: csv.tableName,
            manufacturerId: 'EVO',
            gameId: `EVO_${csv.tableId}`,
            rtp: evalRtp(csv.rtp) || game.rtp,
            archived: false,
          };

          logger.debug(`Archiving game ${gameId}`, { game });
          await updateGame(gameId, ({ ...game, archived: true }: any), tx);
          logger.debug('Creating new game', { evoGame });
          const [migratedGame] = await getGameData(
            { gameId: `EVO_${csv.tableId}` },
            { first: true, withProfilesOnly: false, inclArchived: true },
            tx,
          );
          const evoGameId = migratedGame ? migratedGame.id : (await createGame(evoGame, tx)).id;
          // $FlowIgnore
          if (migratedGame?.archived) await updateGame(evoGameId, { archived: false }, tx);
          // only insert any profiles that happen to be missing from the first migration
          for (const profile of _.differenceWith(
            gameProfiles,
            migratedGame?.gameProfiles,
            _.isEqual,
          )) {
            const { name, brandId } = profile;
            const profileName =
              { slots: 'Slots', rng: 'Table games', live: 'Live' }[csv.gameVertical] || name;
            logger.debug('Getting brand profile', { brandId, profileName });
            const evoProfile = await getBrandProfile(brandId, profileName, tx);
            logger.debug('Assigning profile', { evoGameId, brandId, evoProfile });
            await upsertProfile(evoGameId, brandId, evoProfile.id, tx);
          }
          return `OK:${manufacturerGameId}`;
        });
      } catch (err) {
        logger.error(`ERR: ${e.csv.tableId} ${err.message}`, { error: err, evo: e.csv });
        return `ERR:${g.manufacturerGameId}`;
      }
    });
  }
  return ops;
};

const revertMigration: OperationsGeneratorFunction = async (target) => {
  const ops = [];
  if (target === 'EVO') {
    for (const { gstech: g, evo: e } of getUniqManufacturerGameIds(existingEvoGames, 'EVO')) {
      ops.push(async (gstech: any = g, evo: any = e): Promise<any> => {
        try {
          return await pg.transaction(async (tx): Promise<?string> => {
            const { csv } = evo;
            const { manufacturerGameId } = gstech;
            const migratedGamesData = await getGameData(
              { manufacturerGameId },
              { inclArchived: true, withProfilesOnly: false, first: false },
              tx,
            );
            if (migratedGamesData.length === 1) {
              logger.info(`Cannot revert '${manufacturerGameId}' as it migrated in-place`);
              return `NF:${manufacturerGameId}`;
            }
            const migratedGame = _.find(
              migratedGamesData,
              ({ gameId }) => gameId === `EVO_${csv.tableId}`,
            );
            if (migratedGame) {
              // for (const migratedProfile of migratedGame.gameProfiles) {
              //   const { id: profileId, brandId } = migratedProfile;
              //   await removeGameProfile(migratedGame.id, brandId, profileId, tx);
              // }
              // await removeGame(migratedGame.id, tx);
              // $FlowIgnore
              await updateGame(migratedGame.id, { archived: true }, tx);
              const gameToRestore = _.find(
                migratedGamesData,
                ({ gameId }) => gameId !== `EVO_${csv.tableId}`,
              );
              if (gameToRestore && gameToRestore.archived) {
                // $FlowIgnore
                await updateGame(gameToRestore.id, { archived: false }, tx);
              }
            }
            return `OK:${manufacturerGameId}`;
          });
        } catch (err) {
          logger.error(`ERR: ${e.csv.tableId} ${err.message}`, { error: err, evo: e.csv });
          return `ERR:${g.manufacturerGameId}`;
        }
      });
    }
    return ops;
  }
  // const existing = _.filter(existingGames, ['gstech.manufacturerId', target]);
  const existing = getUniqManufacturerGameIds(existingGames, target);
  for (const { gstech: g, evo: e } of existing) {
    ops.push(async (gstech: any = g, evo: any = e): Promise<any> => {
      try {
        return await pg.transaction(async (tx): Promise<?string> => {
          const { csv } = evo;
          const { manufacturerGameId } = gstech;
          let migratedGames = await getGameData(
            { manufacturerGameId: csv.providerGameId },
            { inclArchived: true, first: false, withProfilesOnly: false },
            tx,
          );
          if (csv.providerGameId !== manufacturerGameId) {
            migratedGames = migratedGames.concat(
              await getGameData(
                { manufacturerGameId },
                { inclArchived: true, first: false, withProfilesOnly: false },
                tx,
              ),
            );
          }
          const migratedEvoGame = _.find(
            migratedGames,
            ({ manufacturerId }) => manufacturerId === 'EVO',
          );
          if (migratedEvoGame) {
            logger.info(`Reverting Existing Game '${manufacturerGameId}'`);
            // for (const migratedProfile of migratedEvoGame.gameProfiles) {
            //   const { id: profileId, brandId } = migratedProfile;
            //   await removeGameProfile(migratedEvoGame.id, brandId, profileId, tx);
            // }
            // await removeGame(migratedEvoGame.id, tx);
            // $FlowIgnore
            await updateGame(migratedEvoGame.id, { archived: true }, tx);
          }
          const gameToRestore = _.find(
            migratedGames,
            ({ manufacturerId }) => manufacturerId !== 'EVO',
          );
          if (gameToRestore && gameToRestore.archived) {
            // $FlowIgnore
            await updateGame(gameToRestore.id, { archived: false }, tx);
          }
          return `OK:${manufacturerGameId}`;
        });
      } catch (err) {
        logger.error(`ERR: ${e.csv.providerGameId} ${err.message}`, { error: err, evo: e.csv });
        return `ERR:${e.csv.providerGameId}`;
      }
    });
  }
  for (const { gstech: g } of getUniqManufacturerGameIds(missingGames, target)) {
    ops.push(async (gstech: any = g): Promise<any> => {
      try {
        return await pg.transaction(async (tx): Promise<?string> => {
          const { manufacturerGameId } = gstech;
          logger.info(`Reverting Missing Game '${manufacturerGameId}'`);
          const [archivedGameData] = await getGameData(
            { manufacturerGameId },
            { inclArchived: true },
            tx,
          );
          if (archivedGameData.archived === true && archivedGameData.manufacturerId === target) {
            // $FlowIgnore
            await updateGame(archivedGameData.id, { archived: false }, tx);
          }
          return `OK:${manufacturerGameId}`;
        });
      } catch (err) {
        logger.error(`ERR: ${gstech.manufacturerGameId} ${err.message}`, { error: err, gstech });
        return `ERR: ${gstech.manufacturerGameId} ${err.message}`;
      }
    });
  }
  return ops;
};

const toggleGameManufacturer: OperationsGeneratorFunction = async (target, action) => {
  const ops = [];
  ops.push(async (manufacturerId: any = target, a: any = action): Promise<any> => {
    try {
      return await pg.transaction(async (tx): Promise<?string> => {
        logger.info(`'${manufacturerId}'`, { a });
        if (a === 'enable') {
          logger.info(`Enabling '${manufacturerId}'`);
          await enableGameManufacturer(manufacturerId, tx);
          return `OK:${a}-${manufacturerId}`;
        }
        if (a === 'disable') {
          logger.info(`Disabling '${manufacturerId}'`);
          await disableGameManufacturer(manufacturerId, tx);
          return `OK:${a}-${manufacturerId}`;
        }
        return `NF:${a}-${manufacturerId}`;
      });
    } catch (err) {
      logger.error(`ERR: ${manufacturerId} ${err.message}`, { error: err });
      return `ERR: ${manufacturerId} ${err.message}`;
    }
  });
  return ops;
};

const toggleGame: OperationsGeneratorFunction = async (target, action) => {
  const ops = [];
  ops.push(async (gameId: any = target, a: any = action): Promise<any> => {
    try {
      return await pg.transaction(async (tx): Promise<?string> => {
        logger.info(`'${gameId}'`, { a });
        if (a === 'enable') {
          logger.info(`Enabling '${gameId}'`);
          await enableGame(gameId, tx);
          return `OK:${a}-${gameId}`;
        }
        if (a === 'disable') {
          logger.info(`Disabling '${gameId}'`);
          await disableGame(gameId, tx);
          return `OK:${a}-${gameId}`;
        }
        return `NF:${a}-${gameId}`;
      });
    } catch (err) {
      logger.error(`ERR: ${gameId} ${err.message}`, { error: err });
      return `ERR: ${gameId} ${err.message}`;
    }
  });
  return ops;
};

const fixTableIds: OperationsGeneratorFunction = async () => {
  const ops = [];
  for (const ftid of tableIdsNeedFixing) {
    ops.push(async (fixTableId: any = ftid): Promise<any> => {
      try {
        return await pg.transaction(async (tx): Promise<?string> => {
          const { gstechKeep, gstechArchive } = fixTableId;
          logger.info(`Archiving ${gstechArchive}`);
          await tx('games').update({ archived: true }).where({ gameId: gstechArchive });
          logger.info(`Promoting ${gstechKeep}`);
          await tx('games')
            .update({ archived: false, mobileGame: true })
            .where({ gameId: gstechKeep });
          return `OK:${ftid.permalink}`;
        });
      } catch (err) {
        return `ERR:${ftid.permalink}`;
      }
    });
  }
  return ops;
};

const changeTableIds: OperationsGeneratorFunction = async (changeTables) =>
  _.map(changeTables, (c) => {
    const [currTableId, newTableIdWRtp] = c.split('->');
    const [newTableId, newRtp] = newTableIdWRtp.split(':');
    return {
      currTableId,
      newTableId,
      newRtp,
    };
  }).map(
    ({ currTableId, newTableId, newRtp }) =>
      async (cTid = currTableId, nTid = newTableId): Promise<any> => {
        try {
          return await pg.transaction(async (tx): Promise<?string> => {
            const currentGame = await getGameData(
              { gameId: `EVO_${cTid}` },
              { inclArchived: true },
              tx,
            );
            if (_.isEmpty(currentGame)) return `NF:${cTid}`;

            const [{ id: currentId, gameProfiles: currProfiles, ...currentGameRest }] = currentGame;
            await updateGame(currentId, { ...currentGameRest, archived: true }, tx);

            const newAlreadyExists = await getGameData(
              { gameId: `EVO_${nTid}` },
              { inclArchived: true },
              tx,
            );
            if (newAlreadyExists) {
              const [{ id: newId, gameProfiles: newProfiles, ...newGameRest }] = newAlreadyExists;
              const rtp = newRtp ? parseFloat(newRtp) : newGameRest.rtp;
              await updateGame(
                newId,
                { ...newGameRest, mobileGame: true, archived: false, rtp },
                tx,
              );
            } else {
              const rtp = newRtp ? parseFloat(newRtp) : currentGameRest.rtp;
              await createGame(
                { ...currentGameRest, mobileGame: true, gameId: `EVO_${nTid}`, rtp },
                tx,
              );
            }
            return `OK:${cTid}`;
          });
        } catch (err) {
          logger.error(err);
          return `ERR:${cTid}`;
        }
      },
  );
// endregion

// region CLI setup
const program = new Command();

const main = async (
  operationsFn: OperationsGeneratorFunction,
  target: any | null,
  { plimit, subsets, action, force, changeTables }: any,
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
    operations = await operationsFn(changeTables);
  } else {
    operations = await operationsFn(target, action || subsets, force);
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
  .action(async (target, options) => main(archiveMissingGames, target, options));

program
  .command('revert')
  .description('Attempt to revert migration of games to Evolution-OSS')
  .addArgument(
    new Argument('target', 'Which game provider to revert migration for').choices([
      'NE',
      'RTG',
      'EVO',
    ]),
  )
  .option('--plimit <plimit>', 'Set promise-limit value.', 1)
  .action(async (target, options) => main(revertMigration, target, options));

program
  .command('provider')
  .description('Toggle game provider state (enable/disable)')
  .addArgument(
    new Argument('target', 'Which game provider to target').choices(['NE', 'RTG', 'EVO', 'RLX']),
  )
  .addArgument(new Argument('action', 'Action to take').choices(['enable', 'disable']))
  .option('--plimit <plimit>', 'Set promise-limit value.', 1)
  .action(async (target, action, options) =>
    main(toggleGameManufacturer, target, { ...options, action }),
  );

program
  .command('game')
  .description('Toggle game state (active/inactive)')
  .addArgument(new Argument('target', 'ID (numeric) of game to target'))
  .addArgument(new Argument('action', 'Action to take').choices(['enable', 'disable']))
  .option('--plimit <plimit>', 'Set promise-limit value.', 1)
  .action(async (target, action, options) => main(toggleGame, target, { ...options, action }));

program
  .command('fixTableIds')
  .description('Fix tableIds that are not matching with idefix games/evolution campaigns')
  .option('--plimit <plimit>', 'Set promise-limit value.', 1)
  .action(async (target, options) => main(fixTableIds, target, options));

program
  .command('changeTableIds')
  .description('Change tableId of a EVO games')
  .addArgument(new Argument('<changeTables...>', `EVO tableIds to change '<old>-><new>[:rtp]'`))
  .option('--plimit <plimit>', 'Set promise-limit value.', 1)
  .action(async (changeTables, options) =>
    main(changeTableIds, null, { ...options, changeTables }),
  );

program.on('*', (o) => logger.error('Invalid command:', o));
program.parse(process.argv);
// endregion
