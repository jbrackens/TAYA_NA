/* @flow */

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');

const { ipAddresses } = require('./Ip');
const { ipCheckSchema } = require('./schemas');

const ipCheckHandler = (req: express$Request, res: express$Response): express$Response => {
  try {
    const { ip } = validate(req.body, ipCheckSchema);
    const result = ipAddresses.find(({ ipAddress }) => ipAddress === ip);

    const response: { matched: boolean, vpn?: boolean, tor?: boolean } = result
      ? { matched: true, vpn: result.list === 'vpn', tor: result.list === 'tor' }
      : { matched: false };
    return res.json(response);
  } catch (e) {
    logger.error('ipCheckHandler', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  ipCheckHandler,
};
