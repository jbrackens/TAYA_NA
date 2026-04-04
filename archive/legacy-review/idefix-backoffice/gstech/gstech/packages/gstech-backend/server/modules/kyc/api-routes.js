/* @flow */
const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const paymentServer = require('gstech-core/modules/clients/paymentserver-api');
const { createDocumentSchema, identifySchema } = require('./schemas');
const Kyc = require('./Kyc');
const { getBrandInfo } = require('../settings');
const { getPlayerWithDetails } = require('../players');
const Minio = require('../photos/Minio');

const uploadDocumentHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { file } = req;
    const photoId = await Minio.uploadPhoto(file.buffer);

    return res.status(201).json({
      photoId,
      originalName: file.originalname,
    });
  } catch (err) {
    logger.warn('uploadDocumentHandler failed', err);
    return next(err);
  }
};

const createDocumentHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const document = await validate(req.body, createDocumentSchema, 'Create document validation failed');
    const updated = await pg.transaction(tx => Kyc.addKycDocument(req.session.playerId, document.type, document.photoId, document.content, null, document.status, null, document.accountId, null, document.fields, document.source, tx));
    return res.json({ ok: true, updated });
  } catch (e) {
    logger.warn('createDocumentHandler', e);
    return next(e);
  }
};

const identifyHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const { urls, paymentProvider } = await validate(req.body, identifySchema, 'Identify validation failed');
    const player = await getPlayerWithDetails(Number(req.session.playerId));
    const brandInfo = await getBrandInfo(brandId);
    const result = await paymentServer.identify({ player, identify: { paymentProvider }, urls, brand: brandInfo });
    return res.json(result);
  } catch (err) {
    logger.warn('identifyHandler', err);
    return res.status(400).json(err);
  }
};

module.exports = { uploadDocumentHandler, createDocumentHandler, identifyHandler };
