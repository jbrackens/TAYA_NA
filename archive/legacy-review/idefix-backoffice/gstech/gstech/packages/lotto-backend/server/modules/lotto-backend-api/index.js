/* @flow */
const { Router } = require('express');
const getIP = require('ipware')().get_ip;

const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');

const operations = require('./operations');
const { handleError } = require('../../utils/errors');
const config = require('../../config');
const schemas = require('./joi');

const router: express$Router<> = Router();  

router.get('/status', (req: express$Request, res: express$Response) => res.json({ ok: true }));

if (config.isDevelopment) {
  router.get('/auth', async (req: express$Request, res: express$Response) => {
    try {
      const { data: { sessionId } } = await axios.request({
        method: 'POST',
        url: `${config.api.backend.walletUrl}/test/init-session`,
        data:
        {
          manufacturer: 'LW',
          initialBalance: 1000,
        },
      });

      res.redirect(`/?gameId=powerball&sessionId=${sessionId}&isMobile=true`);
    } catch (e) {
      logger.error('Buy ticket failed:', e);
      handleError(e, res);
    }
  });
}

router.get('/game/:gameid', async (req: express$Request, res: express$Response) => {
  try {
    const player = await operations.getPlayer(req.cookies.sessionId);
    const gameId = req.params.gameid;

    const game = await operations.getGame(player, gameId);
    const balances = await operations.getBalances(player, game.gametypeid);

    const response = {
      message: '',
      data: { game, balances },
    };

    res.json(response);
  } catch (e) {
    if (e.code === 10004) {
      logger.warn('Get game failed:', e);
    } else {
      logger.error('Get game failed:', e);
    }

    handleError(e, res);
  }
});

router.get('/payout/:gameid', async (req: express$Request, res: express$Response) => {
  try {
    const player = await operations.getPlayer(req.cookies.sessionId);
    const gameId = req.params.gameid;

    const payoutTable = await operations.getPayoutTable(player, gameId);

    const response = {
      message: '',
      data: { payoutTable },
    };

    res.json(response);
  } catch (e) {
    logger.error('Get payout failed:', e);
    handleError(e, res);
  }
});

router.post('/ticket/buy', async (req: express$Request, res: express$Response) => {
  try {
    const player = await operations.getPlayer(req.cookies.sessionId);
    const ipAddress = getIP(req);
    const data = await validate(req.body, schemas.buyTicket, 'buyTicket schema validation failed');

    const balances = await operations.buyTicket(player, req.cookies.sessionId, data, ipAddress.clientIp);

    const response = {
      message: '',
      data: { balances },
    };

    res.json(response);
  } catch (e) {
    if (e.clientMessage === 'general.cutoffpassed') {
      logger.warn('Buy ticket failed:', e);
    } else if (e.clientMessage === 'general.error.nomoney') {
      logger.warn('Buy ticket failed:', e);
    } else {
      logger.error('Buy ticket failed:', e);
    }

    handleError(e, res);
  }
});

router.get('/tickets', async (req: express$Request, res: express$Response) => {
  try {
    const player = await operations.getPlayer(req.cookies.sessionId);
    const tickets = await operations.getTickets(player);

    res.json({ message: '', data: tickets });
  } catch (e) {
    logger.error('Get tickets failed:', e);
    handleError(e, res);
  }
});

module.exports = router;
