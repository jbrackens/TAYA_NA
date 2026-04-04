/* @flow */
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');

const { formatMoney } = require('../core/money');
const { addEvent } = require('../players');
const Person = require('./Person');
const { getPaymentInfo } = require('../payments/Payment');
const { connectPlayersWithPersonHandlerSchema } = require('./schemas');

const connectPlayersWithPersonHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId }: { playerId: Id } = (req.params: any);
    const { playerIds } = validate<{ playerIds: Id[] }>(
      req.body,
      connectPlayersWithPersonHandlerSchema,
    );
    try {
      await pg.transaction(async (tx) => {
        for (const pId of playerIds) {
          await Person.connectPlayersWithPerson(tx, playerId, pId);
          await addEvent(playerId, req.userSession.id, 'account', 'connectPlayerToPerson', { playerId, pId }).transacting(tx);
        }
      });
    } catch (e) {
      logger.error('connectPlayersWithPersonHandler', e);
      return res.status(400).json({ error: 'Not able to connect players' });
    }
    return res.json({ ok: true }).status(200);
  } catch (err) {
    logger.warn('Connect players with person failed');
    return next(err);
  }
};

const disconnectPlayerFromPersonHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId }: { playerId: Id } = (req.params: any);
    await pg.transaction(async (tx) => {
      await Person.disconnectPlayerFromPerson(tx, playerId);
      await addEvent(playerId, req.userSession.id, 'account', 'disconnectPlayerFromPerson', { playerId }).transacting(tx);
    });

    return res.json({ ok: true }).status(200);
  } catch (err) {
    logger.warn('Disconnect players from person failed');
    return next(err);
  }
};

const getConnectedPlayersHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId }: { playerId: Id } = (req.params: any);
    const players = await Person.getConnectedPlayers(pg, playerId);

    const playersWithDetails = await Promise.all(
      players.map(async (p) => {
        const { totalDepositAmount } = await getPaymentInfo(p.id);
        return { ...p, totalDepositAmount: formatMoney(totalDepositAmount, p.currencyId) };
      }),
    );

    return res.json(playersWithDetails).status(200);
  } catch (err) {
    logger.warn('Get connected players failed');
    return next(err);
  }
};

module.exports = {
  connectPlayersWithPersonHandler,
  disconnectPlayerFromPersonHandler,
  getConnectedPlayersHandler,
};
