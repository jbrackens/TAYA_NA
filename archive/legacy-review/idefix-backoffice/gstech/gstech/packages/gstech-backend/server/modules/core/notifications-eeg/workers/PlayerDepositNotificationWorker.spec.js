/* @flow */
const playerDepositNotificationWorker = require('./PlayerDepositNotificationWorker');
const { players: { testPlayer } } = require('../../../../../scripts/utils/db-data');
const Player = require('../../../players/Player');
const { events } = require('../self-consumer');
const { startDeposit, getDeposit } = require('../../../payments/deposits/Deposit');

describe('EEG PlayerDepositNotificationWorker tests', () => {
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
        realityCheckMinutes: number;
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
  let transactionKey;
  let playerDeposit;
  before(async () => {
    player = await Player.create(testPlayer({ countryId: 'FI', currencyId: 'EUR', brandId: 'LD' }));
    const { transactionKey: tKey } = await startDeposit(player.id, 1, 2000);
    transactionKey = tKey;
    player = await Player.getPlayerWithDetails(player.id);
    playerDeposit = await getDeposit(transactionKey);
  });

  it('can notify PlayerDepositNotificationWorker', async () => {
    const job: any = {
      data: { player, deposit: playerDeposit },
    };
    const result = await playerDepositNotificationWorker.handleJob(job);
    // eslint-disable-next-line no-promise-executor-return
    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(events).to.containSubset([{
      name: 'com.idefix.events.Event',
      data: {
        createdDateUtc: result.createdDateUtc,
        customerId: player.id.toString(),
        messageType: 'PlayerDeposit',
        payload: {
          'com.idefix.events.PlayerDeposit': {
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
            deposit: {
              paymentId: playerDeposit.paymentId,
              playerId: player.id,
              accountId: null,
              timestamp: playerDeposit.timestamp.getTime(),
              transactionKey,
              status: 'created',
              paymentParameters: null,
              accountParameters: {},
              counterId: null,
              counterTarget: null,
              counterValue: null,
              bonus: null,
              bonusId: null,
              amount: 20,
              paymentFee: null,
              paymentCost: null,
              paymentMethod: 'BankTransfer',
              paymentProvider: 'Entercash',
              index: null,
            },
          },
        },
      },
    }]);
  });
});
