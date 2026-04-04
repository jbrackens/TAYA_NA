/* @flow */
const { finnishBanks } = require('gstech-core/modules/constants');
const _ = require('lodash');
const api = require('../api');
const logger = require('../logger');
const { handleError } = require('../extensions');
const { redirectScript } = require('../router-helpers');
const temporaryForm = require('../payment/temporary-form');
const configuration = require('../configuration');

const identifyHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const {body} = req;
    const { id } = body;
    const { url, html, requiresFullscreen } = await api.createIdentification(req, id, configuration.baseUrl('/api/identify/ok'), configuration.baseUrl('/api/identify/fail'));
    let ReturnURL = url;
    if (html != null) {
      ReturnURL = await temporaryForm.addForm(html);
    }
    const result = {
      ok: true,
      ReturnURL,
      usesThirdPartyCookie: requiresFullscreen,
    };
    logger.debug('Identify', result);
    return res.json(result);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const identifyFailHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    return res.send(redirectScript('/loggedin/myaccount/withdraw/'));
  } catch (e) {
    logger.warn('Identify process failed', e);
    return res.status(500);
  }
};

const identifyOkHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    await api.tag(req, 'kyc-pending');
    return res.send(redirectScript('/loggedin/myaccount/withdraw/'));
  } catch (e) {
    logger.warn('Identify process failed', e);
    return res.status(500);
  }
};

const getVerificationStatus = async (req: express$Request): Promise<
  {
    docsNeeded: boolean,
    methods: Array<{bank_name: string, id: string, logo: string}>,
    pending: boolean,
    verifiable: boolean,
  },
> => {
  const methods = _.compact<{ id: string, logo: string, bank_name: string }>(
    _.flatten([
      _.includes(['FI'], req.context.countryISO) && finnishBanks
        .filter(bank => bank.id !== 'siirto')
        .map(bank => ({
          id: 'Euteller',
          logo: bank.logo,
          bank_name: bank.name,
        })),
      !_.includes(['FI'], req.context.countryISO) && {
        id: 'Veriff',
        logo: 'Veriff.png',
        bank_name: 'Veriff',
      },
      /*
      _.includes(['FI', 'SE'], req.context.countryISO) && {
        id: 'Zimpler',
        logo: 'Zimpler.png',
        bank_name: 'Zimpler',
      },
      */
    ]),
  );

  return {
    verifiable: true,
    pending:
      _.includes(req.user.details.Tags, 'kyc-pending') ||
      _.includes(req.user.details.Tags, 'kycpending'),
    docsNeeded: false,
    methods,
  };
};

module.exports = {
  identifyHandler,
  identifyFailHandler,
  identifyOkHandler,
  getVerificationStatus,
 };
