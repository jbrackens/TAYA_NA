/* @flow */
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const Kyc = require('./Kyc');
const { photosSchema, addContentDocumentSchema, verifyKycDocumentSchema, updateKycDocumentSchema, kycRequestSchema } = require('./schemas');

const get = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId, kycDocumentId } = req.params;
    const document = await Kyc.getPlayerKycDocument(Number(playerId), Number(kycDocumentId));
    return res.status(200).json(document);
  } catch (err) {
    logger.warn('Get player kyc documents failed');
    return next(err);
  }
};

const getAll = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId } = req.params;
    const documents = await Kyc.getPlayerKycDocuments(Number(playerId));
    return res.status(200).json(documents);
  } catch (err) {
    logger.warn('Get player kyc documents failed');
    return next(err);
  }
};

const getRequests = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId } = req.params;
    const documents = await Kyc.getPlayerKycDocumentRequests(Number(playerId));
    return res.status(200).json(documents);
  } catch (err) {
    logger.warn('Get player kyc documents failed');
    return next(err);
  }
};


const create = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const { photos, documentId, requestId } = await validate(req.body, photosSchema, 'Create kyc document failed');
    if (documentId || requestId) {
      logger.debug('TODO, handle', { documentId, requestId });
    }
    const documents = await Kyc.addPhotos(playerId, photos, req.userSession.id);
    return res.status(200).json(documents);
  } catch (err) {
    logger.warn('Create kyc document failed');
    return next(err);
  }
};

const createDocumentRequest = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const { requestAutomatically, note, message, documents }  = await validate(req.body, kycRequestSchema, 'Create kyc request failed');
    const requests = await Kyc.addKycDocumentRequest(playerId, { requestAutomatically, note, message }, documents, req.userSession.id);
    return res.status(200).json({ requests });
  } catch (err) {
    logger.warn('Create kyc document failed');
    return next(err);
  }
};

const createContentDocument = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const { content, requestId, documentId } = await validate(req.body, addContentDocumentSchema, 'Create content kyc document failed');
    if (documentId || requestId) {
      logger.debug('TODO, handle', { documentId, requestId });
    }
    const document = await Kyc.addContent(playerId, content, req.userSession.id);
    return res.json(document);
  } catch (err) {
    logger.warn('Create content kyc document failed');
    return next(err);
  }
};

const decline = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const id = Number(req.params.kycDocumentId);
    await Kyc.updateKycDocument(id, { status: 'declined' }, req.userSession.id);
    return res.status(200).json({ ok: true });
  } catch (err) {
    logger.warn('Verify kyc document failed');
    return next(err);
  }
};

const verify = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const documentDraft = await validate(req.body, verifyKycDocumentSchema, 'Verify kyc documents failed');
    const id = Number(req.params.kycDocumentId);
    const { expiryDate, type, accountId, content, fields } = documentDraft;
    await Kyc.updateKycDocument(id, { expiryDate, type, status: 'checked', accountId, content, fields }, req.userSession.id);
    return res.status(200).json(documentDraft);
  } catch (err) {
    logger.warn('Verify kyc document failed');
    return next(err);
  }
};

const update = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const kycDocumentId = Number(req.params.kycDocumentId);
    const { photoId, name, expiryDate, content, fields, accountId, type } = await validate(req.body, updateKycDocumentSchema, 'Update kyc document failed');
    const documentDraft = { photoId, name, expiryDate, status: 'checked', content, fields, accountId, type };
    const document = await Kyc.updateKycDocument(kycDocumentId, documentDraft, req.userSession.id);
    return res.status(200).json(document);
  } catch (err) {
    logger.warn('Update kyc document failed');
    return next(err);
  }
};

const updatePhoto = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const kycDocumentId = Number(req.params.kycDocumentId);
    const { photoId } = await validate(req.body, updateKycDocumentSchema, 'Update kyc document photo failed');
    const documentDraft = { photoId, status: 'new' };
    const document = await Kyc.updateKycDocument(kycDocumentId, documentDraft, req.userSession.id);
    return res.status(200).json(document);
  } catch (err) {
    logger.warn('Update kyc document photo faield');
    return next(err);
  }
};

module.exports = {
  get,
  getAll,
  getRequests,
  create,
  createContentDocument,
  createDocumentRequest,
  verify,
  decline,
  update,
  updatePhoto,
};
