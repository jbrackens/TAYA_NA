/* @flow */
const { axios } = require('gstech-core/modules/axios');

const logger = require('gstech-core/modules/logger');
const api = require('gstech-core/modules/clients/backend-payment-api');

const { sessionSignature } = require('./signature');

const config = require('../../../config');
const { getVeriffHeaders } = require('./utils');

const veriffConfig = config.providers.veriff;

type MediaResponse = {
  status: 'success' | 'fail',
  images: {
    id: string,
    name: string,
    url: string,
  }[],
};

const transportMedia = async (sessionId: string, username: string): Promise<string[]> => {
  const headers = getVeriffHeaders(sessionSignature(sessionId, true), false);

  const resp: ?MediaResponse = await axios
    .get(`${veriffConfig.apiUrl}/sessions/${sessionId}/media`, { headers })
    .then(({ data }) => data)
    .catch((e) => logger.error(`Failed to get media list for sessionId ${sessionId}`, e));
  if (resp && resp.status && resp.status === 'success') {
    const responses: {photoId?: string}[] = await Promise.all(
      resp.images.map(async (image) => {
        const imageHeaders = getVeriffHeaders(sessionSignature(image.id, true), false);
        return api
          .uploadDocument(
            username,
            // $FlowFixMe - this is meant to be a buffer, but we used to pass a promise that was any typed
            axios.request({ url: image.url, headers: imageHeaders }),
          )
          .then((r: any) => JSON.parse(r))
          .catch((e) => {
            logger.error(`Not able to upload image ${image.url}`, e);
            return {};
          });
      }),
    );
    return responses.map((v) => (typeof v.photoId === 'string' ? v.photoId : '')).filter(Boolean);
  }
  return [];
};

const identifyHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    if (veriffConfig.apiToken !== req.get('x-auth-client')) {
      throw new Error('Incorrect API token');
    }

    const signature = sessionSignature(req.body, true);
    if (signature !== req.get('x-signature')) {
      throw new Error('Invalid Identify signature');
    }

    const body = JSON.parse(req.body);
    if (body.status !== 'success') {
      throw new Error('Verification not successful');
    }

    const { verification } = body;
    logger.debug('Identification received', verification);
    const fields = [];
    fields.push(['Identification from Veriff', verification.id]);
    fields.push(['- First name', verification.person.firstName]);
    fields.push(['- Last name', verification.person.lastName]);
    fields.push(['- Citizenship', verification.person.citizenship]);
    fields.push(['- ID Number', verification.person.idNumber]);
    fields.push(['- Gender', verification.person.gender]);
    fields.push(['- Date of Birth', verification.person.dateOfBirth]);
    fields.push(['- Year of Birth', verification.person.yearOfBirth]);
    fields.push(['- Nationality', verification.person.nationality]);
    fields.push(['- PEP sanction match', verification.person.pepSanctionMatch]);
    fields.push(['- Document number', verification.document.number]);
    fields.push(['- Document type', verification.document.type]);
    fields.push(['- Document country', verification.document.country]);
    fields.push(['- Document valid from', verification.document.validFrom]);
    fields.push(['- Document valid until', verification.document.validUntil]);

    const content = fields.filter(f => f[1] != null).map(row => row.join(': ')).join('\n');
    const createDocumentRequest = {
      type: 'identification',
      source: 'Veriff',
      fields: verification,
    };

    const doc = { ...createDocumentRequest, content };
    logger.debug('addDocument Veriff', doc);
    await api.addDocument(verification.vendorData, doc);

    const photoIds = await transportMedia(verification.id, verification.vendorData);
    await Promise.all(
      photoIds.map((photoId) =>
        api
          .addDocument(verification.vendorData, { ...createDocumentRequest, photoId })
          .catch((e) => logger.error('Failed to create document for images', e)),
      ),
    );

    return res.json({ status: 'OK' });
  } catch (e) {
    logger.error(JSON.parse(req.body), e);
    return res.status(500).json({ status: 'FAIL' });
  }
};

const eventHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    if (veriffConfig.apiToken !== req.get('x-auth-client')) {
      throw new Error('Incorrect API token');
    }

    const signature = sessionSignature(req.body, true);
    if (signature !== req.get('x-signature')) {
      throw new Error('Invalid Identify signature');
    }

    const body = JSON.parse(req.body);
    logger.debug('Veriff event', body);
    return res.json({ status: 'OK' });
  } catch (e) {
    logger.error(JSON.parse(req.body), e);
    return res.status(500).json({ status: 'FAIL' });
  }
};

module.exports = {
  identifyHandler,
  eventHandler,
};
