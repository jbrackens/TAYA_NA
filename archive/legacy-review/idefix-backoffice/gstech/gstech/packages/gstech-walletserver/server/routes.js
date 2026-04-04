/* @flow */
import type {
  GetJackpotsRequest,
  CreditFreeSpinsRequest,
  CreateFreeSpinsRequest,
  LaunchDemoGameRequest,
  LaunchGameRequest,
} from 'gstech-core/modules/clients/walletserver-api-types';
import type { GameProvider } from 'gstech-core/modules/constants';
import type { GameProviderApi } from './types';

type WalletServerRoutesHandlerFn = (providers: { [GameProvider]: GameProviderApi }) => (
  req: express$Request,
  res: express$Response,
) => Promise<express$Response>;

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const schemas = require('./schemas');

const launchGameHandler: WalletServerRoutesHandlerFn =
  (providers) => async (req: express$Request, res: express$Response) => {
    const logPrefix = `${req.params.manufacturerId} launchGameHandler`;
    try {
      logger.debug(`>>> ${logPrefix}`, { body: req.body });
      const request: LaunchGameRequest = await validate(
        req.body,
        schemas.launchGameSchema,
        'Launch game validation failed',
      );

      const manufacturerId: GameProvider = (req.params.manufacturerId: any);
      const provider = providers[manufacturerId];
      if (provider != null) {
        const gameLaunchInfo = await provider.launchGame(request);
        logger.debug(`<<< ${logPrefix}`, { gameLaunchInfo });
        return res.json(gameLaunchInfo);
      }

      const error = { message: `Game provider '${req.params.manufacturerId}' is not defined` };
      logger.error(`XXX ${logPrefix}`, { request: req.body, error });
      return res.status(400).json({ error });
    } catch (e) {
      logger.error(`XXX ${logPrefix}`, { request: req.body, error: e });
      return res.status(500).json({ error: { code: 201, message: e.message } });
    }
  };

const launchDemoGameHandler: WalletServerRoutesHandlerFn =
  (providers) => async (req: express$Request, res: express$Response) => {
    const logPrefix = `${req.params.manufacturerId} launchDemoGameHandler`;
    try {
      logger.debug(`>>> ${logPrefix}`, { body: req.body });
      const request: LaunchDemoGameRequest = await validate(
        req.body,
        schemas.launchDemoGameSchema,
        'Launch demo game validation failed',
      );

      const { brandId }: { brandId: BrandId } = (req.params: any);
      const manufacturerId: GameProvider = (req.params.manufacturerId: any);
      const provider = providers[manufacturerId];
      if (provider != null) {
        const gameLaunchInfo = await provider.launchDemoGame(brandId, request);
        logger.debug(`<<< ${logPrefix}`, { gameLaunchInfo });
        return res.json(gameLaunchInfo);
      }

      const error = { message: `Game provider '${req.params.manufacturerId}' is not defined` };
      logger.error(`XXX ${logPrefix}`, { request: req.body, error });
      return res.status(400).json({ error });
    } catch (e) {
      logger.error(`XXX ${logPrefix}`, { request: req.body, error: e });
      return res.status(500).json({ error: { code: 201, message: e.message } });
    }
  };

const creditFreeSpinsHandler: WalletServerRoutesHandlerFn =
  (providers) => async (req: express$Request, res: express$Response) => {
    const logPrefix = `${req.params.manufacturerId} creditFreeSpinsHandler`;
    try {
      logger.debug(`>>> ${logPrefix}`, { body: req.body });
      const request: CreditFreeSpinsRequest = await validate(
        req.body,
        schemas.creditFreeSpinsSchema,
        'Credit free spins validation failed',
      );

      const { brandId }: { brandId: BrandId } = (req.params: any);
      const manufacturerId: GameProvider = (req.params.manufacturerId: any);
      const provider = providers[manufacturerId];
      if (provider && provider.creditFreeSpins) {
        try {
          const result = await provider.creditFreeSpins(brandId, request);
          logger.debug(`<<< ${logPrefix}`, { result });
          return res.json(result);
        } catch (e2) {
          logger.error(`XXX ${logPrefix}`, request.player.username, request.bonusCode, e2);
          return res.status(500).json({ error: { code: 201, message: e2.message } });
        }
      }

      return res.json({ ok: false }); // TODO: should return error here?
    } catch (e) {
      logger.error(`XXX ${logPrefix}`, { request: req.body, error: e });
      return res.status(500).json({ error: { code: 201, message: e.message } });
    }
  };


const createFreeSpinsHandler: WalletServerRoutesHandlerFn =
  (providers) => async (req: express$Request, res: express$Response) => {
    const logPrefix = `${req.params.manufacturerId} createFreeSpinsHandler`;
    try {
      logger.debug(`>>> ${logPrefix}`, { body: req.body });
      const request = await validate<CreateFreeSpinsRequest>(
        req.body,
        schemas.createFreeSpinsSchema,
        'Create free spins validation failed',
      );

      const manufacturerId: GameProvider = (req.params.manufacturerId: any);
      const provider = providers[manufacturerId];
      if (provider && provider.createFreeSpins) {
        try {
          const result = await provider.createFreeSpins(request);
          logger.debug(`<<< ${logPrefix}`, { result });
          return res.json(result);
        } catch (e2) {
          logger.error(`XXX ${logPrefix}`, request.tableId, request.bonusCode, e2);
          return res.status(500).json({ error: { code: 201, message: e2.message } });
        }
      }

      return res.json({ ok: false }); // TODO: should return error here?
    } catch (e) {
      logger.error(`XXX ${logPrefix}`, { request: req.body, error: e });
      return res.status(500).json({ error: { code: 201, message: e.message } });
    }
  };


const getJackpotsHandler: WalletServerRoutesHandlerFn =
  (providers) => async (req: express$Request, res: express$Response) => {
    const logPrefix = `${req.params.manufacturerId} getJackpotsHandler`;
    try {
      logger.debug(`>>> ${logPrefix}`, { body: req.body });
      const request: GetJackpotsRequest = await validate(
        req.body,
        schemas.getJackpotsSchema,
        'Get jackpots validation failed',
      );

      const { brandId }: { brandId: BrandId } = (req.params: any);
      const manufacturerId: GameProvider = (req.params.manufacturerId: any);
      const provider = providers[manufacturerId];

      if (provider && provider.getJackpots) {
        const result = await provider.getJackpots(brandId, request);
        logger.debug(`<<< ${logPrefix}`, { result });
        return res.json(result);
      }

      return res.json([]); // TODO: should it return error?
    } catch (e) {
      logger.error(`XXX ${logPrefix}`, { request: req.body, error: e });
      return res.status(500).json({ error: { code: 201, message: e.message } });
    }
  };

const getLeaderBoardHandler: WalletServerRoutesHandlerFn =
  (providers) => async (req: express$Request, res: express$Response) => {
    const logPrefix = `${req.params.manufacturerId} getLeaderBoardHandler`;
    try {
      logger.debug(`>>> ${logPrefix}`, { body: req.body });
      const { brandId, achievement }: { brandId: BrandId, achievement: string } = (req.params: any);
      const manufacturerId: GameProvider = (req.params.manufacturerId: any);
      const provider = providers[manufacturerId];

      if (provider && provider.getLeaderBoard) {
        const result = await provider.getLeaderBoard(brandId, achievement);
        logger.debug(`<<< ${logPrefix}`, { result });
        return res.json(result);
      }

      return res.json([]); // TODO: should it return error?
    } catch (e) {
      logger.error(`XXX ${logPrefix}`, { request: req.body, error: e });
      return res.status(500).json({ error: { code: 201, message: e.message } });
    }
  };

const pingHandler: WalletServerRoutesHandlerFn =
  (providers) => async (req: express$Request, res: express$Response) => {
    const logPrefix = `${req.params.manufacturerId} pingHandler`;
    try {
      const { brandId }: { brandId: BrandId } = (req.params: any);
      const manufacturerId: GameProvider = (req.params.manufacturerId: any);
      const provider = providers[manufacturerId];

      if (provider && provider.ping) {
        const result = await provider.ping(brandId);
        return res.json(result);
      }

      return res.json({ ok: false }); // TODO: should it return error
    } catch (e) {
      logger.error(`XXX ${logPrefix}`, { request: req.body, error: e });
      return res.status(500).json({ error: { code: 201, message: e.message } });
    }
  };

module.exports = {
  launchGameHandler,
  launchDemoGameHandler,
  creditFreeSpinsHandler,
  createFreeSpinsHandler,
  getJackpotsHandler,
  getLeaderBoardHandler,
  pingHandler,
};
