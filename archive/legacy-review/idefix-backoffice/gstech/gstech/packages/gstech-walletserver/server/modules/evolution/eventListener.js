/* @flow */
import type { GameRoundResult } from 'gstech-core/modules/clients/backend-wallet-api';
import type { Envelope } from './types';

const { axios } = require('gstech-core/modules/axios');
const Leader = require('redis-leader');
const { promisify } = require('util');

const redis = require('gstech-core/modules/redis');
const logger = require('gstech-core/modules/logger');
const backend = require('gstech-core/modules/clients/backend-wallet-api');
const money = require('gstech-core/modules/money');
const { getPlayerId } = require('gstech-core/modules/helpers');
const config = require('../../../config');
const { MANUFACTURER_ID } = require('./constants');

const TS_KEY = 'evolution-transmissionId';
const client = redis.createClient();
const get = promisify(client.get.bind(client));
const set = promisify(client.set.bind(client));
const errorTypes = ['unhandledRejection', 'uncaughtException', 'exit'];
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

const configuration = config.providers.evolution;

const handleDepositEvent = async (envelope: Envelope): Promise<?GameRoundResult> => {
  logger.debug('handleDepositEvent', { envelope });

  if (!envelope.event.payload.BalanceChanged) return undefined;
  if (!envelope.event.payload.BalanceChanged.reason.Deposit) return undefined; // this is never the case. it fixes flow types

  const { amount, gameId, gameType, transactionId } = envelope.event.payload.BalanceChanged.reason.Deposit;
  const [, userId] = envelope.event.correlationId.split('|');
  const playerIdentifier = getPlayerId(userId);

  const winRequest = {
    brandId: playerIdentifier.brandId,
    wins: [{ amount: money.parseMoney(amount), type: 'freespins' }],
    manufacturer: MANUFACTURER_ID,
    game: gameType,
    createGameRound: true,
    closeRound: true,
    gameRoundId: `${playerIdentifier.id}-${gameId}`,
    transactionId,
    timestamp: new Date(),
    sessionId: undefined,
  };

  const winResult = await backend.win(playerIdentifier.id, winRequest);

  return winResult;
};

const consumeEventStream = async () => {
  logger.debug('Evolution event-stream');
  const { hostname, casino: { key: username }, api: { password } } = configuration;
  const transmissionId = await get(`${TS_KEY}`);
  const url = `https://${hostname}/api/free-games/v1/event-stream${transmissionId ? `?transmissionId=${transmissionId}` : ''}`;

  logger.debug('Evolution event-stream start listening', { url });
  const { data: stream } = await axios.request({
    url,
    auth: {
      username,
      password,
    },
    responseType: 'stream',
  });
  stream.on('error', (err) => {
    logger.error('Evolution event-stream error', err);
    consumeEventStream();
  });

  stream.on('close', (err) => {
    logger.warn('Evolution event-stream close', err);
    consumeEventStream();
  });

  stream.on('data', async (data) => {
    const raw = data.toString().trim();
    if (raw) {
      try {
        logger.debug('Evolution event-stream envelope', raw);
        const items = raw.split('\n');
        await Promise.all(items.map(async item => {
          logger.debug('Evolution event-stream item', item);
          const envelope: Envelope = JSON.parse(item);
          if (envelope.event.payload.BalanceChanged && envelope.event.payload.BalanceChanged.reason.Deposit) {
            await handleDepositEvent(envelope);
          }
          await set(`${TS_KEY}`, envelope.transmissionId);
        }));
      } catch (e) {
        logger.error('Evolution event-stream event error', { raw: data.toString().trim(), error: e });
      }
    }
  });
};

const startEventConsumption = () => {
  const leader = new Leader(client, { key: 'evolution_listener' });

  errorTypes.map(type => process.on(type, async () => {
    logger.debug('errorTypes');
    try {
      leader.stop();
      process.exit(0);
    } catch (e) {
      process.exit(1);
    }
  }));

  signalTraps.map(type => process.once(type, async () => {
    logger.debug('signalTraps');
    try {
      leader.stop();
    } finally {
      process.kill(process.pid, type);
    }
  }));

  leader.on('elected', () => {
    logger.debug('redis-leader elected');
    consumeEventStream();
  });

  leader.on('revoked', () => {
    logger.debug('redis-leader revoked');
  });

  leader.on('error', (error) => {
    logger.error('redis-leader error', error);
  });

  leader.elect();
};

module.exports = {
  handleDepositEvent,
  startEventConsumption,
};
