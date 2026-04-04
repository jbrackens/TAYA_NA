/* @flow */
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const validate = require('gstech-core/modules/validate');

const Account = require('./Account');
const { updateAccountHolderSchema, updateAccountParametersSchema } = require('./schemas');

const getAccountHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const result = await Account.getAccountWithParameters(Number(req.params.accountId)).where({ playerId: Number(req.session.playerId) });
    return res.json(result);
  } catch (e) {
    logger.warn('get account failed', e);
    return next(e);
  }
};

const updateAccountHolderHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const accountId = Number(req.params.accountId);
    const updateAccountHolder = await validate(req.body, updateAccountHolderSchema, 'Update account holder failed');
    const account = await Account.getAccount(accountId);

    await pg.transaction(tx => Promise.all([
      Account.updateAccountHolder(accountId, updateAccountHolder.accountHolder, tx),
      Account.validateAccountHolder(account.paymentMethodId, account.account, accountId, account.playerId, updateAccountHolder.accountHolder, tx),
    ]));
    return res.status(200).json({ ok: true });
  } catch (err) {
    logger.warn('Update account holder failed');
    return next(err);
  }
};

const updateAccountParametersHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const accountParametersUpdate = await validate(req.body, updateAccountParametersSchema, 'Update account parameters failed');
    const ok = await pg.transaction(tx => Account.updateAccountParameters(Number(req.params.accountId), accountParametersUpdate.parameters, tx));
    return res.status(200).json({ ok });
  } catch (err) {
    logger.warn('Update account parameters failed');
    return next(err);
  }
};

module.exports = {
  getAccountHandler,
  updateAccountHolderHandler,
  updateAccountParametersHandler,
};
