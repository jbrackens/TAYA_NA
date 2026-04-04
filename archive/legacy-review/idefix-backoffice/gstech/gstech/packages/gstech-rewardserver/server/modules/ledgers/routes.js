/* @flow */
import type {
  GetUnusedLedgersParams,
  GetUnusedLedgersResponse,
  UseLedgerResponse,
  UseLedgerParams,
  GetAllPlayerLedgersResponse,
} from 'gstech-core/modules/clients/rewardserver-api-types';
import type { PlayerBalance } from 'gstech-core/modules/types/rewards';

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');

const {
  getAllPlayerLedgersSchema,
  getUnusedLedgersSchema,
  importLedgersSchema,
  markLedgerUsedSchema,
  useLedgerSchema,
  useWheelSpinSchema,
} = require('./schemas');
const Ledgers = require('./Ledgers');

const getAllPlayerLedgers = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const playerId: Id = Number(req.params.playerId);
    const options = validate(req.query, getAllPlayerLedgersSchema);

    const ledgers = await Ledgers.getLedgers(pg, playerId, {
      ...options,
      excludeUsed: false,
      excludeExpired: false,
      excludeDisabled: false,
    });

    const response: DataResponse<GetAllPlayerLedgersResponse> = { data: { ledgers } };
    return res.json(response);
  } catch (e) {
    logger.error('getAllPlayerLedgers error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getAllPlayerLedgersWithEvents = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAllPlayerLedgersWithEvents request', { query: req.query });

    const playerId: Id = Number(req.params.playerId);
    const options = validate(req.query, getAllPlayerLedgersSchema);

    const ledgers = await Ledgers.getLedgers(pg, playerId, {
      ...options,
      excludeUsed: false,
      excludeExpired: false,
      excludeDisabled: false,
      includeEvents: true,
    });

    const response: DataResponse<GetAllPlayerLedgersResponse> = { data: { ledgers } };
    return res.json(response);
  } catch (e) {
    logger.error('getAllPlayerLedgersWithEvents error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getPlayerBalance = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const playerId: Id = Number(req.params.playerId);
    const brandId: BrandId = (req.params.brandId: any);

    const balance = await Ledgers.getPlayerBalance(pg, playerId, brandId);

    const response: DataResponse<PlayerBalance> = { data: balance };
    return res.json(response);
  } catch (e) {
    logger.error('getPlayerBalance error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
}

const getUnusedLedgers = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { brandId } = (req: any).params;
    const { playerId, rewardType, group } = validate<GetUnusedLedgersParams>(
      req.query,
      getUnusedLedgersSchema,
    );

    const ledgers = await Ledgers.getLedgers(pg, playerId, { rewardType, group, brandId });
    const response: DataResponse<GetUnusedLedgersResponse> = {
      data: {
        ledgers,
      },
    };
    return res.json(response);
  } catch (e) {
    logger.error('getUnusedLedgers error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const importPlayerLedgers = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('importPlayerLedgers request', { body: req.body });

    const { playerId, ledgers } = validate(req.body, importLedgersSchema);
    await pg.transaction((tx) => Ledgers.importLedgers(tx, playerId, req.brandId, ledgers));

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('importPlayerLedgers error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const markLedgerUsed = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('markLedgerUsed request', { body: req.body });

    const playerId: Id = Number(req.params.playerId);
    const userId = Number(req.header('x-userid')) || undefined;
    const { comment, groupId } = validate(req.body, markLedgerUsedSchema);

    try {
      await pg.transaction(async (tx) => {
        const ledgers = await Ledgers.markLedgerGroupUsed(tx, groupId, playerId);
        await Ledgers.createLedgersEvents(tx, ledgers.map(({ id }) => id), {
          event: 'mark_used',
          comment,
          userId,
        });
      });
      const response: DataResponse<OkResult> = { data: { ok: true } };
      return res.json(response);
    } catch (e) {
      return res.status(409).json({ error: { message: 'Ledger not found or already used' } });
    }
  } catch (e) {
    logger.error('getPlayersUnusedLedgers error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const useLedger = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('useLedger request', { params: req.params, body: req.body });

    const { ledgerId, playerId } = validate<UseLedgerParams>(
      { ...req.params, ...req.body },
      useLedgerSchema,
    );
    const result = await Ledgers.useLedger(pg, playerId, ledgerId);
    const response: DataResponse<UseLedgerResponse> = {
      data: result.map(({ reward, game }) => ({ reward, game })),
    };
    return res.json(response);
  } catch (e) {
    logger.error('useLedgerSchema error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const useWheelSpin = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('useWheelSpin request', { params: req.params, body: req.body });

    const { playerId } = validate<UseLedgerParams>(req.body, useWheelSpinSchema);
    const result = await Ledgers.usePlayerWheelSpin(pg, req.brandId, playerId);
    const response: DataResponse<UseLedgerResponse> = {
      data: result.map(({ reward, game }) => ({ reward, game })),
    };
    return res.json(response);
  } catch (e) {
    logger.error('useWheelSpin error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  getAllPlayerLedgers,
  getAllPlayerLedgersWithEvents,
  getPlayerBalance,
  getUnusedLedgers,
  importPlayerLedgers,
  markLedgerUsed,
  useLedger,
  useWheelSpin,
};
