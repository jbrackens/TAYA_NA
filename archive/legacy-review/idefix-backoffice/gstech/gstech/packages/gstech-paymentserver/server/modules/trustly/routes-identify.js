/* @flow */

const logger = require('gstech-core/modules/logger');
const api = require('gstech-core/modules/clients/backend-payment-api');
const { decryptFullString } = require('gstech-core/modules/miserypt');

const trustlies = require('./trustly');
const trustlyCustom = require('./trustly-custom');
const { mapPersonId } = require('./utils');

const processHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { body, params: { username } } = req;
    const trustly = trustlies.pnp;
    logger.debug('Trustly identify request', body);

    const { data } = body.params;

    if (data.abort) {
      if (data.abortmessage === 'underage') throw new Error('Player age is under allowed minimum');
      if (data.abortmessage === 'unverified') throw new Error('Cannot collect KYC data for player');
    }
    const fields = [];
    fields.push(['Identification from Trustly', data.kycentityid]);
    fields.push(['- First name', data.attributes.firstname]);
    fields.push(['- Last name', data.attributes.lastname]);
    fields.push(['- Address', data.attributes.street]);
    fields.push(['- ZIP Code', data.attributes.zipcode]);
    fields.push(['- Country', data.attributes.country]);
    fields.push(['- ID Number', mapPersonId(data.attributes.personid)]);
    fields.push(['- Gender', data.attributes.gender]);
    fields.push(['- Date of Birth', data.attributes.dob]);

    const content = fields.filter(f => f[1] != null).map(row => row.join(': ')).join('\n');
    const createDocumentRequest = {
      type: 'identification',
      source: 'Trustly',
      fields: data,
    };

    const doc = { ...createDocumentRequest, content };
    logger.debug('addDocument Trustly', doc);

    const decryptedUsername = decryptFullString(decodeURIComponent(username));
    if (!decryptedUsername) {
      throw Error('username not found');
    }
    await api.addDocument(decryptedUsername, doc);

    const result = await trustlyCustom.createNotificationResponse(trustly, body, 'FINISH');
    return res.send(result);
  } catch (e) {
    logger.error('Trustly deposit notification failed:', e);
    return res.status(500).json({ error: { message: e.message } });
  }
};

module.exports = { processHandler };
