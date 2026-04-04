/* @flow */
const _ = require('lodash');
const joi = require('gstech-core/modules/joi');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');
const { addWithdrawal, acceptWithdrawal, getWithdrawal, processWithdrawal } = require('./withdrawals/Withdrawal');
const { addTransaction } = require('./Payment');
const { updateAccount, getAccountsWithKycData } = require('../accounts/Account');

const testWithdrawalSchema = joi.object({
  amount: joi.number().min(0).default(0),
  provider: joi.string().trim().required(),
  parameters: joi.object().optional(),
}).required();

const testWithdrawalHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const query = await validate(req.body, testWithdrawalSchema, 'testWithdrawalHandler failed');
    const { accounts: acc0 } = await getAccountsWithKycData(req.session.playerId);
    await pg.transaction(tx => Promise.all(acc0.map(a => updateAccount(req.session.playerId, a.id, { active: true, withdrawals: true, kycChecked: true }, 1, tx))));

    const { accounts } = await getAccountsWithKycData(req.session.playerId);
    const acs = accounts.filter(x => x.canWithdraw);
    if (acs.length === 0) {
      logger.warn('Test withdraw failed. No possible accounts.', acc0);
      return res.json({ ok: false });
    }
    const account = _.first(acs);
    await pg.transaction(tx => addTransaction(req.session.playerId, req.session.id, 'compensation', query.amount, 'Play money', 1, tx));
    const txKey = await pg.transaction(async tx => addWithdrawal(Number(req.session.playerId), req.session.id, account.id, query.amount, 0, 'Test WD', 1, null, tx));
    logger.debug('Withdrawal', txKey);
    const wd = await getWithdrawal(txKey);
    logger.debug('Possible payment providers', wd.paymentProviderNames);
    const idx = wd.paymentProviderNames.indexOf(query.provider);
    if (idx !== -1) {
      logger.debug('Accepting withdrawal with provider', wd.paymentProviderIds[idx]);
      await acceptWithdrawal(txKey, wd.paymentProviderIds[idx], query.amount, 1, req.session.playerId, {});
      logger.debug('Wd accepted');

      const process = await processWithdrawal(txKey, 'Set test withdrawal to processing state', {}, query.parameters);
      logger.debug('WD marked processing', txKey, { process });
    }
    return res.json({ ok: true, transactionKey: txKey });
  } catch (e) {
    logger.warn('testWithdrawalHandler failed');
    return next(e);
  }
};

module.exports = { testWithdrawalHandler };
