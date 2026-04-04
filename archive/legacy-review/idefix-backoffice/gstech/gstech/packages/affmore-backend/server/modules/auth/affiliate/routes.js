// @flow
import type {
  LoginRequest,
  AcceptTCRequest,
  AcceptTCResponse,
  PasswordChangeRequest,
  PasswordForgotRequest,
  PasswordUpdateRequest,
  PasswordChangeResponse,
  PasswordForgotResponse,
  PasswordUpdateResponse,
  AffiliateRegisterRequest,
  AffiliateRegisterResponse,
  AffiliateLoginResponse,
} from '../../../../types/api/auth';
import type { InsertAffiliateDraft } from '../../../../types/repository/affiliates';

const { Router } = require('express');

const { isTestEmail } = require('gstech-core/modules/utils');
const logger = require('gstech-core/modules/logger');
const slack = require('gstech-core/modules/slack');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');
const phoneNumber = require('gstech-core/modules/phoneNumber');
const mailer = require('gstech-core/modules/mailer');
const { affmoreBrands } = require('../../../../types/constants');

const { generateEmailTemplate } = require('../../../emailTemplate');
const config = require('../../../config');
const schemas = require('./schemas');
const repository = require('./repository');
const affiliatesRepository = require('../../admin/affiliates/repository');
const subAffiliatesRepository = require('../../admin/affiliates/sub-affiliates/repository');
const logsRepository = require('../../admin/affiliates/logs/repository');
const linksRepository = require('../../admin/affiliates/links/repository');
const passwordHash = require('./passwordHash');
const { generateAuthToken } = require('./middleware');

const router: express$Router<> = Router(); // eslint-disable-line

const registerHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('registerHandler request', { params: req.params, query: req.query });

    const { body, query } = req;
    const request = validate<AffiliateRegisterRequest>({ affiliate: body, query }, schemas.registerSchema);

    const existingAffiliate = await affiliatesRepository.findAffiliateByEmail(pg, request.affiliate.email);
    if (existingAffiliate) return res.status(409).json({ error: { message: 'Affiliate with this email address is already registered' } });

    const { password, ...affiliateData } = request.affiliate;
    const { hash, salt } = await passwordHash.createPasswordHash(password);

    const isInternal = isTestEmail(affiliateData.email);
    const affiliateDraft: InsertAffiliateDraft = {
      ...affiliateData,

      hash,
      salt,

      phone: affiliateData.phone && phoneNumber.tryParse(affiliateData.phone),
      paymentMinAmount: 10000,
      floorBrandCommission: false,
      allowNegativeFee: false,
      allowPayments: false,
      isInternal,
      isClosed: false,
      userId: null,
      masterId: null,
      tcVersion: config.tcVersion,
    };

    const result = await pg.transaction(async (tx) => {
      const affiliate = await affiliatesRepository.createAffiliate(tx, affiliateDraft);
      const token = generateAuthToken(affiliate);

      if (request.query.referral) {
        const parentAffiliate = await affiliatesRepository.getAffiliate(tx, request.query.referral);
        if (parentAffiliate) {
          const subAffiliateDraft = {
            parentId: parentAffiliate.id,
            affiliateId: affiliate.id,
            commissionShare: 5,
          };
          await subAffiliatesRepository.createSubAffiliate(tx, subAffiliateDraft);
        } else {
          logger.warn('Could not register as sub-affiliate because parent affiliate not found', { referral: request.query.referral });
        }
      }

      const referralCode = req.cookies['affmore-ref'];
      if (referralCode) {
        await logsRepository.createAffiliateLog(tx, { note: `Referred by ${referralCode}` }, affiliate.id, 1);
      }

      await Promise.all(affmoreBrands.map(brand => linksRepository.createAffiliateLink(tx, {
        planId: null,
        brandId: brand.id,
        name: `Default Link ${brand.name}`,
        landingPage: brand.url,
      }, affiliate.id)));

      return { affiliate, token, referralCode };
    });

    logger.info('New affiliate registration', { affiliateId: result.affiliate.id, email: result.affiliate.email, referralCode: result.referralCode }, req.headers);
    await slack.logAffiliateMessage('AffMore', 'New affiliate registration', { affiliateId: result.affiliate.id, email: result.affiliate.email, referralCode: result.referralCode });

    const response: DataResponse<AffiliateRegisterResponse> = {
      data: {
        affiliateId: result.affiliate.id,
      },
    };
    return res.header('x-auth-token', result.token).json(response);
  } catch (e) {
    logger.error('registerHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.httpCode === 500 ? 'Server Error' : e.message } });
  }
};

const loginHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('loginHandler request', { params: req.params });

    const request = validate<LoginRequest>(req.body, schemas.loginSchema);

    const affiliate = await affiliatesRepository.findAffiliateByEmail(pg, request.email);
    if (!affiliate) return res.status(403).json({ error: { message: 'Affiliate email and/or password is incorrect' } });

    const valid = await passwordHash.checkPasswordHash(request.password, affiliate.hash, affiliate.salt);
    if (!valid) return res.status(403).json({ error: { message: 'Affiliate email and/or password is incorrect' } });

    if (affiliate.isClosed) return res.status(403).json({ error: { message: 'Affiliate account is closed' } });

    const token = generateAuthToken(affiliate);
    const tcAccepted = affiliate.tcVersion === config.tcVersion;

    await affiliatesRepository.updateLastLoginDate(pg, affiliate.id);

    const response: DataResponse<AffiliateLoginResponse> = {
      data: {
        affiliateId: affiliate.id,
        tcAccepted,
      },
    };
    return res.header('x-auth-token', token).json(response);
  } catch (e) {
    logger.error('loginHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.httpCode === 500 ? 'Server Error' : e.message } });
  }
};

const acceptTCHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('acceptTCHandler request', { session: req.session });

    const request = validate<AcceptTCRequest>({ session: req.session }, schemas.acceptTCSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.session.affiliateId);
    if (!affiliate) return res.status(404).json({ error: { message: 'Affiliate not found' } });

    await affiliatesRepository.acceptTC(pg, request.session.affiliateId, config.tcVersion);

    const response: DataResponse<AcceptTCResponse> = {
      data: {
        ok: true,
      },
    };
    return res.json(response);
  } catch (e) {
    logger.error('acceptTCHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const passwordChangeHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('passwordChangeHandler request', { params: req.params });

    const { session, body } = req;
    const request = validate<PasswordChangeRequest>({ session, ...body }, schemas.passwordChangeSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.session.affiliateId);
    if (!affiliate) return res.status(404).json({ error: { message: 'Affiliate not found' } });

    const isValidPassword = await passwordHash.checkPasswordHash(request.oldPassword, affiliate.hash, affiliate.salt);
    if (!isValidPassword) return res.status(400).json({ error: { message: 'Old password is not valid' } });

    const { hash, salt } = await passwordHash.createPasswordHash(request.newPassword);
    await affiliatesRepository.updateAffiliatePassword(pg, affiliate.id, hash, salt);

    const response: DataResponse<PasswordChangeResponse> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('passwordChangeHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.httpCode === 500 ? 'Server Error' : e.message } });
  }
};

const passwordForgotHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('passwordForgotHandler request', { params: req.params, body: req.body });

    const request = validate<PasswordForgotRequest>(req.body, schemas.passwordForgotSchema);

    const affiliate = await affiliatesRepository.findAffiliateByEmail(pg, request.email);
    if (!affiliate) return res.status(404).json({ error: { message: 'Affiliate email not found' } });

    const pinCode = await repository.createPin(pg, request.email, 'reset', 5);

    const emailTemplate = generateEmailTemplate({
      email: request.email,
      text: `Your affmore.com verification code is: ${pinCode}`,
    });

    const mailOpts = {
      subject: 'affmore.com - Confirmation code',
      from: 'no-reply@affmore.com',
      to: request.email,
      html: emailTemplate,
    };
    await mailer.sendMail(mailOpts);

    const response: DataResponse<PasswordForgotResponse> = {
      data: {
        ok: true,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('passwordForgotHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.httpCode === 500 ? 'Server Error' : e.message } });
  }
};

const passwordUpdateHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('passwordUpdateHandler request', { params: req.params });

    const request = validate<PasswordUpdateRequest>(req.body, schemas.passwordUpdateSchema);

    const affiliate = await affiliatesRepository.findAffiliateByEmail(pg, request.email);
    if (!affiliate) return res.status(404).json({ error: { message: 'Affiliate email not found' } });

    const isValidPin = await repository.validatePin(pg, request.email, request.pinCode, 'reset');
    if (!isValidPin) return res.status(400).json({ error: { message: 'Pin code is not valid' } });

    const { hash, salt } = await passwordHash.createPasswordHash(request.newPassword);
    await affiliatesRepository.updateAffiliatePassword(pg, affiliate.id, hash, salt);

    const response: DataResponse<PasswordUpdateResponse> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('passwordUpdateHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.httpCode === 500 ? 'Server Error' : e.message } });
  }
};

module.exports = {
  registerHandler,
  loginHandler,
  acceptTCHandler,
  passwordChangeHandler,
  passwordForgotHandler,
  passwordUpdateHandler,
};
