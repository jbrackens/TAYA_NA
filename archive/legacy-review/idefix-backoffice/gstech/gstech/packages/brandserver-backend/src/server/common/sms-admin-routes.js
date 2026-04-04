/* @flow */
const logger = require('./logger');
const smsverification = require('./smsverification');
const { handleError } = require("./extensions");

const returnValidResponse = async (number: any | string) => {
  const verify = await smsverification.verify(undefined, number);
  return { verify };
};

const bind = (app: express$Application<express$Request, express$Response>) => {
  app.post('/api/admin/smsverification', async (req: express$Request, res: express$Response) => {
    try {
      let number = req.body.phone;
      if (number[0] !== '+') {
        number = `+${number}`;
      }

      const result = await smsverification.sendPinCode(req, req.body.lang, number);
      const resp = await returnValidResponse(number);
      logger.debug('Post smsverification', req.body, resp, result);
      res.json({ ...resp, ...result });
    } catch (e) {
      logger.error('Post smsverification failed', req.body);
      return handleError(req, res, e);
    }
  });

  app.get('/api/admin/smsverification', async (req: express$Request, res: express$Response) => {
    try {
      logger.debug('Get smsverification', req.query);
      const response = await returnValidResponse(((req.query.phone: any): string));
      res.json(response);
    } catch (e) {
      logger.error('Get smsverification failed', req.body);
      return handleError(req, res, e);
    }
  });
};

module.exports = { bind };
