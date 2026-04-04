/* @flow */
const { createJourney } = require('./journey');
const { getDetails } = require('./modules/legacy-player');
const { getAvailableBonus } = require('./modules/bonus');
const { getFullBalance } = require('./modules/balance');

module.exports = (app: express$Application<express$Request, express$Response>) => {
  app.get('/api/test/balance', async (req: express$Request, res: express$Response) => {
    const balance = await getFullBalance(req);
    res.json(balance);
  });

  app.get('/api/test/progress', async (req: express$Request, res: express$Response) => {
    const journey = await createJourney(req);
    res.json(journey.meterStates);
  });

  app.get('/api/test/details', async (req: express$Request, res: express$Response) => {
    const details = await getDetails(req);
    return res.json(details);
  });

  app.get('/api/test/bonuses', async (req: express$Request, res: express$Response) => {
    const bonus = await getAvailableBonus(req);
    return res.json(bonus);
  });

  app.get('/api/test/tags', async (req: express$Request, res: express$Response) => {
    const journey = await createJourney(req);
    return res.json(journey.tags);
  });
};
