// @flow
import type { GetChildrenAffiliatesAdminRequest, GetChildrenAffiliatesResponse, CreateChildAffiliateAdminRequest, CreateChildAffiliateResponse } from '../../../../../types/api/children';
import type { InsertAffiliateDraft } from '../../../../../types/repository/affiliates';

const { isTestEmail } = require('gstech-core/modules/utils');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const config = require('../../../../config');
const affiliatesRepository = require('../repository');
const repository = require('./repository');
const schemas = require('./schemas');

const getChildrenAffiliatesHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getChildrenAffiliatesHandler request', { session: req.session, params: req.params, body: req.body });

    const { params: { affiliateId } } = validate<GetChildrenAffiliatesAdminRequest>({ session: req.session, params: req.params }, schemas.getChildrenAffiliatesSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const affiliates = await repository.getChildrenAffiliates(pg, affiliateId);

    const response: DataResponse<GetChildrenAffiliatesResponse> = {
      data: {
        affiliates: affiliates.map(a => ({
          affiliateId: a.id,
          affiliateName: a.name,
          affiliateEmail: a.email,
        })),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getChildrenAffiliatesHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const createChildAffiliateHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('createChildAffiliateHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params, body } = req;
    const request = validate<CreateChildAffiliateAdminRequest>({ session, params, affiliate: body }, schemas.createChildAffiliateSchema);
    const { affiliate: affiliateData } = request;

    const existingAffiliate = await affiliatesRepository.findAffiliateByEmail(pg, affiliateData.email);
    if (existingAffiliate) return res.status(409).json({ error: { message: 'Affiliate with this email address is already registered' } });

    const masterAffiliate = await affiliatesRepository.getAffiliate(pg, request.params.affiliateId);

    if (!masterAffiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const affiliateDraft: InsertAffiliateDraft = {
      ...affiliateData,

      hash: masterAffiliate.hash,
      salt: masterAffiliate.salt,

      contactName: masterAffiliate.contactName,
      countryId: masterAffiliate.countryId,
      address: masterAffiliate.address,
      phone: masterAffiliate.phone,
      skype: masterAffiliate.skype,
      vatNumber: masterAffiliate.vatNumber,
      paymentMinAmount: masterAffiliate.paymentMinAmount,
      paymentMethod: masterAffiliate.paymentMethod,
      paymentMethodDetails: masterAffiliate.paymentMethodDetails,
      floorBrandCommission: masterAffiliate.floorBrandCommission,
      allowNegativeFee: masterAffiliate.allowNegativeFee,
      allowPayments: false,
      allowEmails: false,
      isInternal: isTestEmail(affiliateData.email),
      isClosed: false,
      userId: masterAffiliate.userId,
      masterId: masterAffiliate.id,
      tcVersion: config.tcVersion,
    };

    await affiliatesRepository.createAffiliate(pg, affiliateDraft);

    const response: DataResponse<CreateChildAffiliateResponse> = {
      data: {
        ok: true,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('createChildAffiliateHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  getChildrenAffiliatesHandler,
  createChildAffiliateHandler,
};
