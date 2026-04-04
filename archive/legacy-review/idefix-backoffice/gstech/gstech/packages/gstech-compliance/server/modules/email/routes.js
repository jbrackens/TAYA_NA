/* @flow */

const { axios } = require('gstech-core/modules/axios');

const { isTestEmail } = require('gstech-core/modules/utils');
const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');

const schemas = require('./schemas');
const config = require('../../config');

const emailCheckHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { email } = validate(req.body, schemas.emailCheckSchema);

    if (isTestEmail(email)) return res.status(200).json({ status: 'ok' });

    try {
      const { data: r } = await axios.get(`https://api.sendgrid.com/v3/validations/email`, {
        headers: {
          Authorization: `Bearer ${config.emailCheck.apiKey}`,
        },
        data: {
          email,
        },
      });

      logger.debug('emailVerification', email, r);
      let response: { ok: boolean, suggestion?: string } = { ok: false };
      if (r && r.result) {
        const { result } = r;
        if (['Valid', 'Risky'].includes(result.verdict)) response = { ok: true };
        else if (result.checks.domain.is_suspected_disposable_address)
          logger.warn('Rejecting email address!', email);

        if (result.suggestion) {
          const newEmail = `${result.local}@${result.suggestion}`;
          response.suggestion = newEmail !== email ? newEmail : undefined;
        }
      }

      return res.status(200).json({ data: response });
    } catch (e) {
      logger.error('emailCheck sendgrid request fail', e);
      return res.status(503).json({ error: { message: 'Sendgrid api error' } });
    }
  } catch (e) {
    logger.error('emailVerification error', e);
    return res.status(500).json({ error: { message: 'Something went wrong' } });
  }
};

module.exports = {
  emailCheckHandler,
};
