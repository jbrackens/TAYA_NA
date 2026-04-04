// @flow
import type { ClickRequest, RefRequest } from '../../../types/api/clicks';

const { DateTime } = require('luxon');
const { Router } = require('express');
const querystring = require('querystring');
const getIP = require('ipware')().get_ip;

const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');

const config = require('../../config');
const schemas = require('./schemas');
const repository = require('../admin/affiliates/links/repository');
const affiliatesRepository = require('../admin/affiliates/repository');

const router: express$Router<> = Router(); // eslint-disable-line

const brandMapping = ['LD', 'CJ', 'KK', 'OS', 'FK', 'SN', 'VB'];
const brandDefaultLandings = {
  CJ: 'https://casinojefe.com',
  KK: 'https://justwow.com',
  LD: 'https://luckydino.com',
  OS: 'https://olaspill.com',
  FK: 'https://hipspin.com',
  SN: 'https://freshspins.com',
  VB: 'https://vie.bet',
};

const clickHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('clickHandler request', { params: req.params, body: req.body });

    const { headers, params, query } = req;
    const { clientIp } = getIP(req);
    const request = validate<ClickRequest>({ headers, params, query }, schemas.clickSchema);

    const link = await repository.getAffiliateLinkByCode(pg, request.params.code);
    const brandId = brandMapping[request.params.brandNumber] || request.params.brandNumber || link?.brandId;
    const defaultLanding = brandDefaultLandings[brandId];

    if (!link) {
      logger.warn('No link found for click', request.params.code);
      if (defaultLanding)
        return res.redirect(defaultLanding);

      return res.status(404).json({
        error: { message: 'Code does not correspond to any existing link' },
      });
    }

    const affiliate = await affiliatesRepository.getAffiliate(pg, link.affiliateId);

    if (!affiliate) {
      logger.warn('Affiliate not found', request.params.code);
      if (defaultLanding)
        return res.redirect(defaultLanding);

      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    if (affiliate.isClosed) {
      logger.warn('Affiliate account is closed', request.params.code);

      if (defaultLanding)
        return res.redirect(defaultLanding);

      return res.status(403).json({
        error: { message: 'Affiliate account is closed' },
      });
    }

    const clickDraft = {
      linkId: link.id,
      clickDate: DateTime.utc().toJSDate(),
      referralId: request.query && request.query.rid,
      segment: (request.query && request.query.segment) || request.params.segment,
      queryParameters: request.query,
      ipAddress: clientIp,
      userAgent: request.headers['user-agent'],
      referer: request.headers.referrer,
    };
    const click = await repository.createClick(pg, clickDraft);

    const queryParameters = {
      btag: `${link.affiliateId}_${link.code}_${click.id}`,
    };

    const separator = link.landingPage.indexOf('?') === -1 ? '?' : '&';
    return res.redirect(`${link.landingPage}${separator}${querystring.stringify({ ...req.query, ...queryParameters })}`);
  } catch (e) {
    logger.error('clickHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const refHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('refHandler request', { params: req.params, body: req.body });

    const { params, query } = req;
    const request = validate<RefRequest>({ params, query }, schemas.refSchema);
    res.cookie('affmore-ref', request.params.code, { path: '/', secure: config.isProduction, maxAge: 1000 * 60 * 60 * 24 * 30 * 6 });
    return res.redirect(request.query.url);
  } catch (e) {
    logger.error('refHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  clickHandler,
  refHandler,
};
