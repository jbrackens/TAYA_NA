/* @flow */
const pg = require('gstech-core/modules/pg');
const { players: { john } } = require('../../../scripts/utils/db-data');
const { getWithdrawalMethods } = require('../payments/withdrawals/Withdrawal');
const { addTransaction } = require('../payments/Payment');
const { addKycDocument, hasValidDocument } = require('./index');
const { findOrCreateAccount, updateAccount } = require('../accounts');
const Player = require('../players/Player');

describe('Kyc', () => {
  describe('When player has no documents', () => {
    let playerId;
    before(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
    });

    it('reports there is no valid document', async () => {
      const doc = await hasValidDocument(playerId, 'identification');
      expect(doc).to.equal(false);
    });
  });

  describe('When payment methods registered but not validated', () => {
    let playerId;
    let accountId;
    before(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);

      await pg.transaction(async (tx) => {
        await addTransaction(playerId, null, 'compensation', 5000, 'Added some money', 1, tx);
        await addKycDocument(playerId, 'identification', null, 'Doc 123213', null, 'checked', undefined, undefined, 1, {}, null, tx);
        accountId = await findOrCreateAccount(playerId, 1, 'XXXXX123123', null, 1, { bic: 'DABAIE2D' }, tx);
        await addKycDocument(playerId, 'payment_method', null, 'Doc 123213', null, 'new', undefined, accountId, 1, {}, null, tx);
      });
    });

    it('disallows withdrawals', async () => {
      const { methods } = await getWithdrawalMethods(playerId);
      expect(methods.length).to.equal(0);
    });

    it('withdrawals are allowed after validating the account', async () => {
      await pg.transaction(tx => updateAccount(playerId, accountId, { kycChecked: true }, 1, tx));
      const { methods } = await getWithdrawalMethods(playerId);
      expect(methods.length).to.equal(1);
    });
  });

  describe('When player has empty account', () => {
    let playerId;
    before(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);

      await pg.transaction(async (tx) => {
        await addTransaction(playerId, null, 'compensation', 5000, 'Added some money', 1, tx);
        await addKycDocument(playerId, 'identification', null, 'Doc 123213', null, 'checked', undefined, undefined, 1, {}, null, tx);
        await findOrCreateAccount(playerId, 1, '', null, 1, {}, tx);
      });
    });

    it('disallows withdrawals', async () => {
      const { methods } = await getWithdrawalMethods(playerId);
      expect(methods.length).to.equal(0);
    });

    it('when account is added wd still not allowed', async () => {
      await pg.transaction(async (tx) => {
        const id = await findOrCreateAccount(playerId, 1, 'XXXXX123123', null, 1, { bic: 'DABAIE2D' }, tx);
        await addKycDocument(playerId, 'payment_method', null, 'Doc 123213', null, 'checked', undefined, id, 1, {}, null, tx);
        return id;
      });
      const { methods } = await getWithdrawalMethods(playerId);
      expect(methods.length).to.equal(0);
    });

    it('withdrawals are allowed after validating the account', async () => {
      await pg.transaction(async (tx) => {
        const id = await findOrCreateAccount(playerId, 1, 'XXXXX123123', null, 1, { bic: 'DABAIE2D' }, tx);
        await addKycDocument(playerId, 'payment_method', null, 'Doc 123213', null, 'checked', undefined, id, 1, {}, null, tx);
        await updateAccount(playerId, id, { kycChecked: true }, 1, tx);
      });
      const { methods } = await getWithdrawalMethods(playerId);
      expect(methods.length).to.equal(1);
    });
  });


  describe('When all payment methods are validated', () => {
    let playerId;

    beforeEach(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      await pg.transaction(async (tx) => {
        addTransaction(playerId, null, 'compensation', 5000, 'Added some money', 1, tx);
        await addKycDocument(playerId, 'identification', null, 'Doc 123213', null, 'checked', undefined, undefined, 1, {}, null, tx);
        const accountId = await findOrCreateAccount(playerId, 1, 'XXXXX123123', null, 1, { bic: 'DABAIE2D' }, tx);
        await addKycDocument(playerId, 'payment_method', null, 'Doc 123213', null, 'checked', undefined, accountId, 1, {}, null, tx);
        await updateAccount(playerId, accountId, { kycChecked: true }, 1, tx);
      });
    });

    it('reports there is a valid document', async () => {
      const doc = await hasValidDocument(playerId, 'identification');
      expect(doc).to.equal(true);
    });

    it('allows withdrawal when there is empty account', async () => {
      await pg.transaction(tx => findOrCreateAccount(playerId, 1, '', null, 1, {}, tx));
      const { methods } = await getWithdrawalMethods(playerId);
      expect(methods.length).to.equal(1);
    });

    it('allows withdrawal from validated method', async () => {
      const { methods } = await getWithdrawalMethods(playerId);
      expect(methods.length).to.equal(1);
    });

    it('allows withdrawal only to verified account also when an account is added', async () => {
      await pg.transaction(tx => findOrCreateAccount(playerId, 1, 'XXXXX123124', null, 1, { bic: 'DABAIE2D' }, tx));
      const { methods } = await getWithdrawalMethods(playerId);
      expect(methods.length).to.equal(1);
      expect(methods[0].account).to.equal('XXXXX123123');
    });
  });
});
