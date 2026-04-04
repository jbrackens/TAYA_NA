/* @flow */
const pg = require('gstech-core/modules/pg');
const playerWithdrawalNotificationWorker = require('./PlayerWithdrawalNotificationWorker');
const { players: { testPlayer } } = require('../../../../../scripts/utils/db-data');
const { findOrCreateAccount } = require('../../../accounts');
const { addTransaction } = require('../../../payments/Payment');
const Player = require('../../../players/Player');
const { createWithdrawal, acceptWithdrawal } = require('../../../payments/withdrawals/Withdrawal');
const { getWithdrawal } = require('../repository');
const { events } = require('../self-consumer');

describe('EEG PlayerWithdrawalNotificationWorker tests', () => {
  let player:
    | {
        accountClosed: boolean,
        accountSuspended: boolean,
        activated: boolean,
        additionalFields?: any,
        address: string,
        affiliateRegistrationCode: string,
        allowEmailPromotions: boolean,
        allowGameplay: boolean,
        allowSMSPromotions: boolean,
        allowTransactions: boolean,
        brandId: BrandId,
        city: string,
        countryId: string,
        createdAt: Date,
        currencyId: string,
        dateOfBirth: string,
        dd: { flagged: boolean, lockTime: ?Date, locked: boolean },
        email: string,
        firstName: string,
        gamblingProblem: boolean,
        id: number,
        languageId: string,
        lastName: string,
        loginBlocked: boolean,
        mobilePhone: string,
        nationalId: ?string,
        nationality?: string,
        numDeposits: number,
        partial: boolean,
        placeOfBirth?: string,
        pnp: boolean,
        postCode: string,
        preventLimitCancel: boolean,
        registrationSource: ?string,
        selfExclusionEnd: ?Date,
        tags: Array<string>,
        tcVersion: number,
        testPlayer: boolean,
        username: string,
        verified: boolean,
        realityCheckMinutes: number,
      }
    | {
        activated: boolean,
        additionalFields?: any,
        address: string,
        affiliateRegistrationCode: string,
        brandId: BrandId,
        city: string,
        countryId: string,
        createdAt: Date,
        currencyId: string,
        dateOfBirth: string,
        email: string,
        firstName: string,
        id: number,
        languageId: string,
        lastName: string,
        mobilePhone: string,
        nationalId: ?string,
        nationality?: string,
        placeOfBirth?: string,
        postCode: string,
        tcVersion: number,
        testPlayer: boolean,
        username: string,
        verified: boolean,
      };
  let withdrawalId;
  let accountId;
  let transactionKey;
  let timestamp;
  let playerWithdrawal;
  before(async () => {
    player = await Player.create(testPlayer({ countryId: 'FI', currencyId: 'EUR', brandId: 'LD' }));
    accountId = await pg.transaction(async (tx) => {
      const acc = await findOrCreateAccount(player.id, 1, 'FI2112345600008739', null, 1, { bic: 'NDEAFIHH' }, tx);
      await addTransaction(player.id, null, 'compensation', 5000, 'Added some money', 1, tx);
      return acc;
    });
    transactionKey = await createWithdrawal(player.id, null, accountId, 2500);
    const wd = await pg('payments').first('id', 'timestamp').where({ transactionKey });
    await acceptWithdrawal(transactionKey, 1, 2500, 1, player.id, { staticId: 213 });
    withdrawalId = wd.id;
    timestamp = wd.timestamp;

    player = await Player.getPlayerWithDetails(player.id);
    playerWithdrawal = await getWithdrawal(wd.id, pg);
  });

  it('can notify PlayerWithdrawalNotificationWorker', async () => {
    const job: any = {
      data: { player, withdrawal: playerWithdrawal },
    };
    const result = await playerWithdrawalNotificationWorker.handleJob(job);
    // eslint-disable-next-line no-promise-executor-return
    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(events).to.containSubset([{
        name: 'com.idefix.events.Event',
        data: {
          createdDateUtc: result.createdDateUtc,
          customerId: player.id.toString(),
          messageType: 'PlayerWithdrawal',
          payload: {
            'com.idefix.events.PlayerWithdrawal': {
              player: {
                playerId: player.id,
                brandId: player.brandId,
                username: player.username,
                email: player.email,
                firstName: player.firstName,
                lastName: player.lastName,
                address: player.address,
                postCode: player.postCode,
                city: player.city,
                mobilePhone: player.mobilePhone,
                countryId: player.countryId,
                dateOfBirth: player.dateOfBirth,
                languageId: player.languageId,
                nationalId: player.nationalId,
                currencyId: player.currencyId,
                allowEmailPromotions: true,
                allowSMSPromotions: true,
                createdAt: player.createdAt.getTime(),
                activated: player.activated,
                verified: player.verified,
                selfExclusionEnd: null,
                allowGameplay: true,
                allowTransactions: true,
                loginBlocked: false,
                accountClosed: false,
                accountSuspended: false,
                numDeposits: 0,
                testPlayer: player.testPlayer,
                gamblingProblem: false,
                tcVersion: player.tcVersion,
                partial: false,
                tags: [],
                placeOfBirth: player.placeOfBirth,
                nationality: player.nationality,
                additionalFields: player.additionalFields,
                registrationSource: null,
              },
              withdrawal: {
                paymentId: withdrawalId,
                playerId: player.id,
                accountId,
                account: 'FI2112345600008739',
                timestamp: timestamp.getTime(),
                transactionKey,
                status: 'accepted',
                amount: 25,
                paymentParameters: { staticId: '213' },
                accountParameters: { bic: 'NDEAFIHH' },
                paymentMethod: 'BankTransfer',
                paymentProvider: 'Entercash',
              },
            },
          },
        },
      },
    ]);
  });
});
