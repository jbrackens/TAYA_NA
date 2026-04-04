/* @flow */
const pg = require('gstech-core/modules/pg');
const { players: { john } } = require('../../../scripts/utils/db-data');
const { findOrCreateAccount, getAccounts, getAccount, getAccountsWithKycData, updateAccount } = require('./index');
const { addKycDocument } = require('../kyc');
const Player = require('../players/Player');
const { findByPlayerId } = require('../players/query');

describe('Accounts', () => {
  let playerId;

  beforeEach(async () => {
    await clean.players();
    playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
  });

  it('registers an account', async () => {
    const accounts = await getAccounts(playerId);
    expect(accounts).to.be.empty();

    const accountId = await pg.transaction(tx =>
      findOrCreateAccount(playerId, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx));
    const accountsAfterRegister = await getAccounts(playerId);
    expect(accountsAfterRegister.length).to.equal(1);
    expect(accountsAfterRegister[0].id).to.equal(accountId);
  });

  it('registers an account with account holder', async () => {
    const accounts = await getAccounts(playerId);
    expect(accounts).to.be.empty();

    const accountId = await pg.transaction(tx =>
      findOrCreateAccount(playerId, 1, 'FI2112345600008739', 'John Doe', 1, { bic: 'DABAIE2D' }, tx));
    const account = await getAccount(accountId);
    expect(account.accountHolder).to.equal('John Doe');
    const player = await findByPlayerId(playerId, 1);
    if (player != null) {
      expect(player.fraudIds.length).to.equal(0);
      expect(player.kycDocuments.length).to.equal(0);
    }
  });

  it('registers a bank account and updates it with account holder', async () => {
    const accounts = await getAccounts(playerId);
    expect(accounts).to.be.empty();

    const accountId0 = await pg.transaction(tx =>
      findOrCreateAccount(playerId, 1, '', null, 1, { bic: 'DABAIE2D' }, tx));
    const accountId = await pg.transaction(tx =>
      findOrCreateAccount(playerId, 1, '', 'John Doe', 1, {}, tx));
    expect(accountId0).to.equal(accountId);
    const account = await getAccount(accountId);
    expect(account.accountHolder).to.equal('John Doe');
    const player = await findByPlayerId(playerId, 1);
    if (player != null) {
      expect(player.fraudIds.length).to.equal(0);
      expect(player.kycDocuments.length).to.equal(0);
    }
  });

  it('registers two bank accounts with account holders', async () => {
    const accounts = await getAccounts(playerId);
    expect(accounts).to.be.empty();

    const accountId0 = await pg.transaction(tx =>
      findOrCreateAccount(playerId, 1, '', null, 1, { bic: 'DABAIE2D' }, tx));
    const accountId1 = await pg.transaction(tx =>
      findOrCreateAccount(playerId, 1, '', 'John Doe', 1, {}, tx));
    expect(accountId0).to.equal(accountId1);

    const accountId2 = await pg.transaction(tx =>
      findOrCreateAccount(playerId, 1, '', null, 1, {}, tx));

    const accountId = await pg.transaction(tx =>
      findOrCreateAccount(playerId, 1, '', 'Mary Doe', 1, {}, tx));
    expect(accountId).to.not.equal(accountId2);
    expect(accountId0).to.equal(accountId2);

    const account = await getAccount(accountId);
    expect(account.accountHolder).to.equal('Mary Doe');
    const player = await findByPlayerId(playerId, 1);
    if (player != null) {
      expect(player.fraudIds.length).to.equal(0);
      expect(player.kycDocuments.length).to.equal(1);
    }
  });

  it('updates an account with account holder and verifies account', async () => {
    const accounts = await getAccounts(playerId);
    expect(accounts).to.be.empty();

    await pg.transaction(tx =>
      findOrCreateAccount(playerId, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx));

    const accountId = await pg.transaction(tx =>
      findOrCreateAccount(playerId, 1, 'FI2112345600008739', 'John Doe', 1, { bic: 'DABAIE2D' }, tx));
    const account = await getAccount(accountId);
    expect(account.accountHolder).to.equal('John Doe');
    expect(account.kycChecked).to.equal(true);
    const player = await findByPlayerId(playerId, 1);
    if (player != null) {
      expect(player.fraudIds).to.deep.equal([]);
      expect(player.kycDocuments).to.deep.equal([]);
    }
  });

  it('creates kyc task when account holder does not match player name and auto verification allowed', async () => {
    const accounts = await getAccounts(playerId);
    expect(accounts).to.be.empty();

    await pg.transaction(tx =>
      findOrCreateAccount(playerId, 1, 'FI2112345600008739', 'Jack Sparrow', 1, { bic: 'DABAIE2D' }, tx));
    const player = await findByPlayerId(playerId, 1);
    if (player != null) {
      expect(player.fraudIds).to.deep.equal([]);
      expect(player.kycDocuments.length).to.equal(1);
    }
  });

  it('creates fraud task when account holder does not match player name and auto verification not allowed', async () => {
    const accounts = await getAccounts(playerId);
    expect(accounts).to.be.empty();

    await pg.transaction(tx =>
      findOrCreateAccount(playerId, 4, '444444xxxxxxxxx4444', 'Jack Sparrow', 1, { bic: 'DABAIE2D' }, tx));
    const player = await findByPlayerId(playerId, 1);
    if (player != null) {
      expect(player.fraudIds.length).to.equal(1);
      expect(player.kycDocuments).to.deep.equal([]);
    }
  });


  it('updates an account with account holder not matching player name', async () => {
    const accounts = await getAccounts(playerId);
    expect(accounts).to.be.empty();

    await pg.transaction(tx =>
      findOrCreateAccount(playerId, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx));
    const player = await findByPlayerId(playerId, 1);
    if (player != null) {
      expect(player.fraudIds).to.deep.equal([]);
      expect(player.kycDocuments).to.deep.equal([]);
    }
    const accountId = await pg.transaction(tx =>
      findOrCreateAccount(playerId, 1, 'FI2112345600008739', 'Jack Sparrow', 1, { bic: 'DABAIE2D' }, tx));
    const account = await getAccount(accountId);
    expect(account.accountHolder).to.equal('Jack Sparrow');
    const player2 = await findByPlayerId(playerId, 1);
    if (player2 != null) {
      expect(player2.fraudIds).to.deep.equal([]);
      expect(player2.kycDocuments.length).to.equal(1);
    }
  });

  it('registers an account only once with same account number', async () => {
    const accounts = await getAccounts(playerId);
    expect(accounts).to.be.empty();
    const accountId = await pg.transaction(async (tx) => {
      await findOrCreateAccount(playerId, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx);
      return await findOrCreateAccount(playerId, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx);
    });

    const accountsAfterRegister = await getAccounts(playerId);
    expect(accountsAfterRegister.length).to.equal(1);
    expect(accountsAfterRegister[0].id).to.equal(accountId);
  });

  it('registers account without account number only once', async () => {
    const accounts = await getAccounts(playerId);
    expect(accounts).to.be.empty();
    const accountId = await pg.transaction(async (tx) => {
      await findOrCreateAccount(playerId, 1, '', null, 1, { bic: 'DABAIE2D' }, tx);
      return await findOrCreateAccount(playerId, 1, '', null, 2, { bic: 'DABAIE2D' }, tx);
    });

    const accountsAfterRegister = await getAccounts(playerId);
    expect(accountsAfterRegister.length).to.equal(1);
    expect(accountsAfterRegister[0].id).to.equal(accountId);
  });

  it('fetches list of player accounts with documents', async () => {
    await pg.transaction(async (tx) => {
      await findOrCreateAccount(playerId, 1, '', null, 1, {}, tx);
      await findOrCreateAccount(playerId, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx);
      const accountId = await findOrCreateAccount(playerId, 1, 'FI2112345600008780', null, 1, { bic: 'DABAIE2D' }, tx);
      await addKycDocument(playerId, 'payment_method', null, 'Doc 123213', null, 'checked', undefined, accountId, 1, {}, null, tx);
      await findOrCreateAccount(playerId, 10, '', null, 1, { }, tx);
      await updateAccount(playerId, accountId, { kycChecked: true }, 1, tx);
    });

    const { accounts: result } = await getAccountsWithKycData(playerId);
    expect(result).to.containSubset([
      {
        account: 'FI2112345600008780',
        active: true,
        withdrawals: true,
        parameters: {
          bic: 'DABAIE2D',
        },
        method: 'BankTransfer',
        kyc: 'Verified (1 Docs)',
        allowWithdrawals: true,
        documents: [
          {
            content: 'Doc 123213',
          },
        ],
      },
      {
        account: '',
        allowWithdrawals: false,
        kyc: 'Not possible',
      },
      {
        account: 'FI2112345600008739',
        active: true,
        withdrawals: true,
        parameters: {
          bic: 'DABAIE2D',
        },
        method: 'BankTransfer',
        kyc: 'Not verified',
        allowWithdrawals: true,
        documents: [],
      },
      {
        account: '',
        active: true,
        allowWithdrawals: false,
        kyc: 'Not possible',
        kycChecked: false,
        method: 'Sofort',
      },
    ]);
  });
});
