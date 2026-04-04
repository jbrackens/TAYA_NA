/* @flow */
import type {
  OptimoveCustomer,
  OptimoveTransaction,
  OptimoveGame,
  OptimoveGameType,
  OptimoveGameWithGameType,
} from './optimove-types';

const knex = require('knex');
const config = require('gstech-core/modules/config');
const logger = require('gstech-core/modules/logger');
const { upsert2 } = require('gstech-core/modules/knex');

const pg: Knex = knex({
  client: 'pg',
  debug: config.optimove.debug,
  pool: {
    min: config.optimove.pool.min,
    max: config.optimove.pool.max,
  },
  log: {
    warn(message: string) {
      const { stack } = new Error();
      logger.warn('KNEX', { message, stack });
    },
    error(message: string) {
      const { stack } = new Error();
      logger.error('KNEX', { message, stack });
    },
    deprecate(message: string) {
      const { stack } = new Error();
      logger.warn('KNEX deprecate', { message, stack });
    },
    debug(message: { sql: string, bindings: any[] }) {
      logger.debug('KNEX', message);
    },
  },
  connection: {
    host: config.optimove.host,
    port: config.optimove.port,
    user: config.optimove.user,
    password: config.optimove.password,
    database: config.optimove.database,
    timezone: 'Europe/Malta',
    ...(config.optimove.ca
      ? {
          ssl: {
            ca: config.optimove.ca,
          },
        }
      : {}),
  },
});

const findCustomerById = async (id: Id, tx: ?Knex): Promise<?OptimoveCustomer> => {
  const customer = await (tx || pg)('Customers').where('PlayerID', id).first();
  return customer;
};

const upsertCustomer = async (
  customerData: OptimoveCustomer,
  tx: ?Knex,
): Promise<OptimoveCustomer> => {
  const optimoveCustomer = await upsert2(
    tx || pg,
    'Customers',
    { ...customerData, LastUpdated: new Date() },
    ['PlayerID'],
  );
  return optimoveCustomer;
};

const upsertTransaction = async (
  transactionData: OptimoveTransaction,
  tx: ?Knex,
): Promise<OptimoveTransaction> => {
  const optimoveTransaction = await upsert2(
    tx || pg,
    'Transactions',
    { ...transactionData, LastUpdated: new Date() },
    ['TransactionID'],
  );
  return optimoveTransaction;
};

const upsertGame = async (gameData: OptimoveGame, tx: ?Knex): Promise<OptimoveGame> => {
  const optimoveGame = await upsert2(tx || pg, 'Games', { ...gameData, LastUpdated: new Date() }, [
    'GameRoundID',
  ]);
  return optimoveGame;
};

const upsertGameType = async (gameTypeData: OptimoveGameType, tx: ?Knex): Promise<OptimoveGame> => {
  const optimoveGameType = await upsert2(tx || pg, 'GameTypesAndCategories', gameTypeData, [
    'GameID',
  ]);
  return optimoveGameType;
};

const upsertTransactionSafe = async (
  transactionData: OptimoveTransaction,
): Promise<?OptimoveTransaction> =>
  await pg.transaction(async (tx) => {
    const customerExists = await findCustomerById(transactionData.PlayerID, tx);
    if (!customerExists) return undefined;
    return await upsertTransaction(transactionData, tx);
  });

const upsertCustomerAndTransaction = async (
  customerData: OptimoveCustomer,
  transactionData: OptimoveTransaction,
): Promise<OptimoveTransaction> =>
  await pg.transaction(async (tx) => {
    const customerExists = await findCustomerById(transactionData.PlayerID, tx);
    if (!customerExists) await upsertCustomer(customerData, tx);
    return await upsertTransaction(transactionData, tx);
  });

const updateCustomerBalance = async (
  id: Id,
  balance: Money,
  tx: ?Knex,
): Promise<OptimoveCustomer> => {
  const optimoveCustomer = await (tx || pg)('Customers')
    .update({ Balance: balance, LastUpdated: new Date() })
    .where({ PlayerID: id });
  return optimoveCustomer;
};

const upsertGameAndUpdateCustomerBalance = async (
  { GameType: gameTypeData, ...gameData }: OptimoveGameWithGameType,
  newBalance: Money,
): Promise<?[OptimoveGameType, OptimoveGame, OptimoveCustomer]> =>
  await pg.transaction(async (tx) => {
    const customerExists = await findCustomerById(gameData.PlayerID, tx);
    if (!customerExists) return undefined;
    const optimoveGameType = await upsertGameType(gameTypeData, tx);
    const optimoveGame = await upsertGame(gameData, tx);
    const optimoveCustomer = await updateCustomerBalance(gameData.PlayerID, newBalance, tx);
    return [optimoveGameType, optimoveGame, optimoveCustomer];
  });

module.exports = {
  findCustomerById,
  upsertCustomer,
  upsertTransaction,
  upsertTransactionSafe,
  upsertCustomerAndTransaction,
  upsertGame,
  updateCustomerBalance,
  upsertGameAndUpdateCustomerBalance,
};
