/* @flow */
const Boom = require('@hapi/boom');
const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const Account = require('./Account');
const { addKycDocument, updateKycDocument } = require('../kyc');
const PaymentMethod = require('./PaymentMethod');
const { accountSchema, accountDocumentSchema, updateAccountSchema, updateAccountDocumentSchema } = require('./schemas');

const getAccountsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const result = await Account.getAccountsWithKycData(Number(req.params.playerId));
    return res.status(200).json(result);
  } catch (err) {
    logger.warn('Get accounts failed', err);
    return next(Boom.notFound());
  }
};

const addAccountHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const accountDraft = await validate(req.body, accountSchema, 'Add account failed');
    const paymentMethod = await PaymentMethod.get(accountDraft.method);
    const userId = (req.userSession && req.userSession.id) || null;
    if (!paymentMethod || paymentMethod.id == null) {
      throw Boom.badRequest(`Payment method not found: ${accountDraft.method}`);
    }
    const accountId = await pg.transaction(async (tx) => {
      const accId = await Account.createAccount(Number(req.params.playerId), paymentMethod.id, accountDraft.account, accountDraft.accountHolder, userId, accountDraft.parameters, tx);
      await Account.updateAccount(Number(req.params.playerId), accId, accountDraft, userId, tx);
      await Promise.all((accountDraft.documents || []).map(doc =>
        addKycDocument(Number(req.params.playerId), 'payment_method', doc.photoId, doc.content, doc.name, 'checked', doc.expiryDate, accId, userId, {}, null, tx)));
      return accId;
    });
    return res.status(200).json(accountId);
  } catch (err) {
    logger.warn('Add account failed', err);
    return next(err);
  }
};

const addAccountDocumentHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { photoId, expiryDate, content, name } = await validate(req.body, accountDocumentSchema, 'Add account document failed');
    const playerId = Number(req.params.playerId);
    const accountId = Number(req.params.accountId);
    const document = await pg.transaction(tx =>
      addKycDocument(playerId, 'payment_method', photoId, content, name, 'checked', expiryDate, accountId, req.userSession.id, {}, null, tx));
    return res.status(200).json(document);
  } catch (err) {
    logger.warn('Add account document failed');
    return next(err);
  }
};

const updateAccountDocumentHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { content, expiryDate } = await validate(req.body, updateAccountDocumentSchema, 'Update account document failed');
    const documentId = Number(req.params.documentId);
    await updateKycDocument(documentId, { content, expiryDate }, req.userSession.id);
    return res.status(200).json({});
  } catch (err) {
    logger.warn('Update account document failed');
    return next(err);
  }
};

const removeAccountDocumentHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const documentId = Number(req.params.documentId);

    await updateKycDocument(documentId, { status: 'outdated' }, req.userSession.id);
    return res.status(200).json({});
  } catch (err) {
    logger.warn('Remove account document failed');
    return next(err);
  }
};

const updateAccountHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const accountUpdate = await validate(req.body, updateAccountSchema, 'Update account failed');
    const account = await pg.transaction(tx => Account.updateAccount(Number(req.params.playerId), Number(req.params.accountId), accountUpdate, req.userSession.id, tx));
    return res.status(200).json(account);
  } catch (err) {
    logger.warn('Update account failed');
    return next(err);
  }
};

module.exports = {
  getAccountsHandler,
  addAccountHandler,
  updateAccountDocumentHandler,
  updateAccountHandler,
  addAccountDocumentHandler,
  removeAccountDocumentHandler,
};
