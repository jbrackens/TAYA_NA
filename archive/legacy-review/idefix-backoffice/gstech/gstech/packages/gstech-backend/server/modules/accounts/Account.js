/* @flow */
import type { Account, AccountWithParameters } from 'gstech-core/modules/types/backend';

const uniqBy = require('lodash/uniqBy');
const pg = require('gstech-core/modules/pg');
const { addEvent, getPlayerById } = require('../players');
const { addPlayerFraud } = require('../frauds');
const { allowsWithdrawals, placeholderBankAccount } = require('./validate');
const { getWdMethods } = require('../payments/withdrawals/WithdrawalInfo');
const { matchName } = require('../frauds');
const { addKycDocument } = require('../kyc');
const PaymentMethod = require('./PaymentMethod');

const ACCOUNTS = 'accounts';

const ACCOUNT_FIELDS = ['id', 'playerId', 'account', 'accountHolder', 'paymentMethodId', 'parameters', 'withdrawals', 'kycChecked'];
const ACCOUNT_RET_FIELDS = ['id', 'active', 'withdrawals', 'account', 'accountHolder', 'parameters', 'kycChecked'];

const getAccounts = (playerId: Id): Promise<{ id: Id, account: string }[]> =>
  pg(ACCOUNTS).select('id', 'account').where({ playerId });

const getAccount = (id: Id): Knex$QueryBuilder<Account> =>
  pg(ACCOUNTS).first(ACCOUNT_FIELDS).where({ id });

const getAccountWithParameters = (id: Id): Knex$QueryBuilder<AccountWithParameters> =>
  pg(ACCOUNTS)
    .first('playerId', 'account', 'accountHolder', 'paymentMethodId', 'withdrawals', 'parameters', 'payment_methods.name as paymentMethod', 'kycChecked')
    .innerJoin('payment_methods', 'payment_methods.id', 'accounts.paymentMethodId')
    .where({ 'accounts.id': id });

const updateAccount = async (playerId: Id, id: Id, { active, withdrawals, kycChecked, account, parameters }: { active?: boolean, withdrawals?: boolean, kycChecked?: boolean, account?: string, accountHolder?: string, parameters?: mixed }, userId: ?Id, tx: Knex): Promise<any> => {
  if (active != null) {
    const i = await tx(ACCOUNTS).update({ active }).where({ playerId, id, active: !active }).returning(ACCOUNT_RET_FIELDS);
    if (i != null) {
      await addEvent(playerId, userId, 'account', 'updateAccount.active', i[0]).transacting((tx: any));
    }
  }
  if (withdrawals != null) {
    const i = await tx(ACCOUNTS).update({ withdrawals }).where({ playerId, id, withdrawals: !withdrawals }).returning(ACCOUNT_RET_FIELDS);
    if (i.length > 0) {
      await addEvent(playerId, userId, 'account', 'updateAccount.withdrawals', i[0]).transacting((tx: any));
    }
  }
  if (kycChecked != null) {
    const i = await tx(ACCOUNTS).update({ kycChecked }).where({ playerId, id, kycChecked: !kycChecked }).returning(ACCOUNT_RET_FIELDS);
    if (i.length > 0) {
      await addEvent(playerId, userId, 'account', 'updateAccount.kycChecked', i[0]).transacting((tx: any));
    }
  }
  if (account != null) {
    const acc = await tx('accounts').first('account').where({ id });
    const i = await tx(ACCOUNTS)
      .update({ account })
      .where({ playerId, id })
      .whereNot({ account })
      .returning(ACCOUNT_RET_FIELDS);
    if (i.length > 0) {
      await addEvent(playerId, userId, 'account', 'updateAccount.account', { account, oldAccount: acc.account }).transacting((tx: any));
    }
  }
  if (parameters != null) {
    const acc = await tx('accounts').first('id', 'parameters').where({ id });
    const mergedParameters = { ...acc.parameters, ...parameters };
    await tx(ACCOUNTS).update({ parameters: mergedParameters }).where({ id: acc.id });
  }
  return await tx(ACCOUNTS).first(ACCOUNT_RET_FIELDS).where({ playerId, id });
};

const validateAccountHolder = async (paymentMethodId: Id, account: string, accountId: Id, playerId: Id, accountHolder: string, tx: Knex) => {
  const player = await getPlayerById(playerId);
  const paymentMethod = await PaymentMethod.getById(paymentMethodId).transacting(tx);
  const nameMatch = matchName(accountHolder, `${player.firstName} ${player.lastName}`);
  if (paymentMethod.allowAutoVerification) {
    if (nameMatch) {
      await addKycDocument(playerId, 'payment_method', null, `Account holder automatically verified: ${accountHolder}`, null, 'checked', null, accountId, null, { accountHolder }, 'Account', tx);
      await updateAccount(playerId, accountId, { kycChecked: true }, null, tx);
    } else {
      await addKycDocument(playerId, 'payment_method', null, `Account holder: ${accountHolder}`, null, 'new', null, accountId, null, { accountHolder }, 'Account', tx);
    }
  } else if (!nameMatch) {
    await addPlayerFraud(playerId, 'payment_method_owner', accountHolder, {
      paymentMethod: paymentMethod.name,
      account,
      owner: accountHolder,
    });
  }
};

const updateAccountHolder = async (accountId: Id, accountHolder: mixed, tx: Knex$Transaction<any>): Promise<boolean> => {
  const acc = await tx('accounts').first('id', 'parameters', 'accountHolder', 'kycChecked').where({ id: accountId }).forUpdate();
  if (acc != null) {
    await tx(ACCOUNTS).update({ accountHolder }).where({ id: acc.id });
    return true;
  }
  throw new Error('Unable to update account!');
};

const updateAccountParameters = async (accountId: Id, parameters: mixed, tx: Knex$Transaction<any>): Promise<boolean> => {
  const acc = await tx('accounts').first('id', 'parameters', 'accountHolder', 'kycChecked').where({ id: accountId }).forUpdate();
  if (acc != null) {
    await tx(ACCOUNTS).update({ parameters: { ...acc.parameters, ...parameters } }).where({ id: acc.id });
    return true;
  }
  throw new Error('Unable to update account!');
};

const createAccount = async (playerId: Id, paymentMethodId: Id, account: string, accountHolder: ?string, userId: ?Id, parameters: mixed, tx: Knex): Promise<Id> => {
  const [{ id }] = await tx('accounts')
    .insert({ playerId, paymentMethodId, account, accountHolder, parameters })
    .returning('id');
  const paymentMethod = await tx('payment_methods').first('name').where({ id: paymentMethodId });
  await addEvent(playerId, userId, 'account', 'createAccount', { account, type: paymentMethod.name, accountHolder }).transacting((tx: any));
  if (accountHolder != null) {
    await validateAccountHolder(paymentMethodId, account, id, playerId, accountHolder, tx);
  }
  return id;
};

const findOrCreateAccount = async (playerId: Id, paymentMethodId: Id, account: string, accountHolder: ?string, userId: ?Id, parameters: mixed, tx: Knex$Transaction<any>): Promise<Id> => {
  let acc;
  if (account === '' && accountHolder != null) {
    acc = await tx('accounts').first('id', 'parameters', 'accountHolder', 'kycChecked').where({ playerId, paymentMethodId, account, accountHolder });
    if (acc == null) {
      acc = await tx('accounts').first('id', 'parameters', 'accountHolder', 'kycChecked')
        .where({ playerId, paymentMethodId, account })
        .whereNull('accountHolder')
        .orderBy('id', 'desc');
    }
  } else {
    acc = await tx('accounts').first('id', 'parameters', 'accountHolder', 'kycChecked').where({ playerId, paymentMethodId, account });
  }

  if (acc != null) {
    if (parameters != null) {
      await tx(ACCOUNTS).update({ parameters: { ...acc.parameters, ...parameters } }).where({ id: acc.id });
    }
    if (acc != null && account !== '') {
      await tx(ACCOUNTS).update({ account }).where({ id: acc.id });
    }
    if (accountHolder !== acc.accountHolder && accountHolder != null) {
      await tx(ACCOUNTS).update({ accountHolder }).where({ id: acc.id });
      await validateAccountHolder(paymentMethodId, account, acc.id, playerId, accountHolder, tx);
    }
    return acc.id;
  }

  return await createAccount(playerId, paymentMethodId, account, accountHolder, userId, parameters, tx);
};

export type AccountInfo = {
  method: string,
  account: string,
};

type AccountWithKycData = {
  active: boolean,
  allowWithdrawals: boolean,
  created: Date,
  lastUsed: Date,
  requireVerification: boolean,
  kycDocumentId: Id[],
  expiryDate: Date[],
  photoId: Id[],
  content: string[],
  name: string[],
} & AccountWithParameters & AccountInfo;

const mapDocuments = (account: AccountWithKycData) => {
  const { kycDocumentId, expiryDate, photoId, content, name } = account;
  const docs = kycDocumentId.map((id, idx) => ({
    id,
    expiryDate: expiryDate[idx],
    photoId: photoId[idx],
    content: content[idx],
    name: name[idx],
  }));
  return uniqBy(docs.filter(d => d.id != null), 'id');
};

const getAccountsWithKycData = (playerId: Id): any =>
  pg.transaction(async (tx) => {
    const { methods, description } = await getWdMethods(playerId, tx);
    const accounts: AccountWithKycData[] = await tx(ACCOUNTS)
      .leftOuterJoin('kyc_documents', (qb) =>
        qb
          .on('accounts.id', 'kyc_documents.accountId')
          .on('kyc_documents.status', '!=', pg.raw('?', 'outdated')),
      )
      .innerJoin('payment_methods', 'accounts.paymentMethodId', 'payment_methods.id')
      .innerJoin('payment_providers', 'payment_methods.id', 'payment_providers.paymentMethodId')
      .leftOuterJoin('payments', {
        'accounts.id': 'payments.accountId',
        'payments.status': pg.raw('?', 'complete'),
      })
      .select(
        'accounts.id as id',
        'account',
        pg.raw('(accounts.active and payment_methods.active) as active'),
        'accounts.withdrawals',
        'accounts.parameters',
        'accounts.accountHolder',
        'kycChecked',
        pg.raw('bool_or(payment_providers.withdrawals) as "allowWithdrawals"'),
        pg.raw('payment_methods.name as method'),
        'payment_methods.requireVerification',
        'accounts.createdAt as created',
        pg.raw('array_agg(kyc_documents.id) as "kycDocumentId"'),
        pg.raw('array_agg(kyc_documents."expiryDate") as "expiryDate"'),
        pg.raw('array_agg(kyc_documents."photoId") as "photoId"'),
        pg.raw('array_agg(kyc_documents.content) as "content"'),
        pg.raw('array_agg(kyc_documents.name) as "name"'),
        pg.raw('max(payments.timestamp) as "lastUsed"'),
      )
      .where({ 'accounts.playerId': playerId })
      .groupBy('accounts.id')
      .groupBy('payment_methods.id')
      .orderBy('payment_methods.active', 'desc')
      .orderBy('accounts.active', 'desc')
      .orderBy('accounts.kycChecked', 'desc')
      .orderBy('accounts.id');

    const getKycStatus = (account: AccountWithKycData) => {
      if (account.kycChecked) {
        return 'Verified';
      }
      if (placeholderBankAccount(account)) {
        return 'Verify another account with IBAN';
      }
      if (account.requireVerification) {
        return 'Not verified';
      }
      return 'Not possible';
    };

    const getWdStatus = (account: AccountWithKycData) =>
      methods.some((acc) => acc.id === account.id);

    const result = accounts.map((account) => {
      const documents = mapDocuments(account);
      const kyc = getKycStatus(account);
      return {
        id: account.id,
        account: account.account,
        active: account.active,
        accountHolder: account.accountHolder,
        withdrawals: account.withdrawals,
        parameters: account.parameters,
        method: account.method,
        created: account.created,
        lastUsed: account.lastUsed,
        kycChecked: account.kycChecked,
        kyc: kyc + (documents.length > 0 ? ` (${documents.length} Docs)` : ''),
        allowWithdrawals: allowsWithdrawals(account) && account.active && account.allowWithdrawals,
        canWithdraw: getWdStatus(account) && allowsWithdrawals(account) && account.active && account.allowWithdrawals,
        documents,
      };
    });
    return { description, accounts: result };
  });

module.exports = {
  getAccounts,
  getAccount,
  getAccountWithParameters,
  findOrCreateAccount,
  createAccount,
  getAccountsWithKycData,
  updateAccount,
  updateAccountParameters,
  validateAccountHolder,
  updateAccountHolder,
};
