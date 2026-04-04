/* @flow */
const { Router } = require('express');

const logger = require('gstech-core/modules/logger');
const db = require('../../db');

const router: express$Router<> = Router();  

router.post('/freelines/:playerid/:gameId/:freelinescount', async (req: express$Request, res: express$Response) => {
  try {
    const gameType = await db.getGameTypeByGameId(req.params.gameId);
    if (!gameType) throw new Error(`Game '${req.params.gameId}' is not available for crediting free spins to`);

    const freeLine = {
      playerid: Number(req.params.playerid),
      gametypeid: Number(gameType.gametypeid),
      freelinescount: Number(req.params.freelinescount),
    };

    await db.incrementPlayerFreeLines(freeLine);

    const response = {
      message: 'Ok',
      data: { },
    };

    res.json(response);
  } catch (e) {
    logger.error('Post free spins failed:', e);

    res.status(400);
    res.json({ error: e.message });
  }
});

router.get('/jackpot/:gameid/:currency', async (req: express$Request, res: express$Response) => {
  try {
    const { currency, gameid: gameId } = req.params;

    const game = await db.getGameTypeByGameId(gameId);
    if (game) {
      const gameCurrency = await db.getCurrency(game.currency);
      const targetCurrency = await db.getCurrency(currency);

      const response = {
        message: '',
        data: {
          amount: String((Math.round((game.currentjackpot / Number(gameCurrency.fx_rate)) * Number(targetCurrency.fx_rate)))),
          currency,
        },
      };

      res.json(response);
    } else {
      res.json({ message: '', data: {} });
    }
  } catch (e) {
    logger.error('Get jackpots failed:', e);

    res.status(400);
    res.json({ error: e.message });
  }
});

module.exports = router;
