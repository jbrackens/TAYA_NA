/* @flow */
import type { Deposit, Withdrawal } from 'gstech-core/modules/types/backend';
import type { PlayerForOptimove, GameRoundForOptimove } from './repository';

const {
  mapOptimoveCustomer,
  mapOptimoveDeposit,
  mapOptimoveWithdrawal,
  mapOptimoveGameWithGameType,
} = require('./optimove-mappers');

describe('Optimove Data Mappers', () => {
  const timestamp = new Date();

  describe('maps player to an Optimove Customer', () => {
    const player: PlayerForOptimove = {
      id: 3000001,
      createdAt: timestamp,
      email: 'john.doe@hotmail.com',
      mobilePhone: '4903944433231',
      dateOfBirth: '1985-12-14',
      allowEmailPromotions: true,
      allowSMSPromotions: true,
      loginBlocked: false,
      testPlayer: false,
      affiliateId: 'Test Affiliate',
      brandId: 'LD',
      username: 'LD_John.Doe_3000001',
      countryId: 'DE',
      currencyId: 'EUR',
      firstName: 'John',
      lastName: 'Doe',
      languageId: 'de',
      activated: true,
      accountClosed: false,
      accountSuspended: false,
      gamblingProblem: false,
      activeLimits: [],
      registrationSource: null,
    };
    it('without balance property', () => {
      const optimoveCustomer = mapOptimoveCustomer(player);
      expect(optimoveCustomer).to.deep.equal({
        PlayerID: player.id,
        RegisteredDate: timestamp,
        Email: player.email,
        MobilePhone: player.mobilePhone,
        DateOfBirth: player.dateOfBirth,
        IsOptIn: player.allowEmailPromotions,
        IsSMSOptIn: player.allowSMSPromotions,
        IsEmailOptIn: player.allowEmailPromotions,
        IsBlocked: player.loginBlocked,
        IsTest: player.testPlayer,
        CasinoName: player.brandId,
        Alias: player.username,
        Gender: null,
        Country: player.countryId,
        Currency: player.currencyId,
        FirstName: player.firstName,
        LastName: player.lastName,
        ReferralType: null,
        AffiliateID: player.affiliateId,
        Language: player.languageId,
        RegisteredPlatform: player.registrationSource,
        Activated: player.activated,
        AccountClosed: player.accountClosed,
        AccountSuspended: player.accountSuspended,
        GamblingProblem: player.gamblingProblem,
        ExclusionLimit: false,
        TimeoutLimit: false,
      });
    });
    it('with balance property', () => {
      const balanceInfo = {
        balance: 1000,
        reservedBalance: 0,
        bonusBalance: 0,
      };
      const optimoveCustomerWithBalance = mapOptimoveCustomer({ ...player, ...balanceInfo });
      expect(optimoveCustomerWithBalance).to.have.property('Balance', balanceInfo.balance);
    });
    it('maps exclusion limit flag', () => {
      const optimoveCustomer = mapOptimoveCustomer({...player, activeLimits: ['exclusion']});
      expect(optimoveCustomer).to.have.property('ExclusionLimit', true);
    })
    it('maps timeout flag', () => {
      const optimoveCustomer = mapOptimoveCustomer({...player, activeLimits: ['timeout']});
      expect(optimoveCustomer).to.have.property('TimeoutLimit', true);
    })
    it('maps both limit flags', () => {
      const optimoveCustomer = mapOptimoveCustomer({
        ...player,
        activeLimits: ['exclusion', 'timeout'],
      });
      expect(optimoveCustomer).to.have.property('TimeoutLimit', true);
      expect(optimoveCustomer).to.have.property('ExclusionLimit', true);
    })
  });

  it('maps deposit to an Optimove Transaction', () => {
    const deposit: Deposit = {
      paymentId: 100000001,
      playerId: 3000001,
      accountId: 0,
      username: 'LD_John.Doe_3000001',
      timestamp,
      transactionKey: '374125e0-a453-11ec-9384-27c0a27aac4f',
      paymentMethod: 'BankTransfer',
      paymentProvider: 'Directa24',
      status: 'created',
      message: '',
      account: '',
      amount: 2000,
      parameters: null,
      index: 0,
      paymentFee: 0,
      paymentCost: 0,
      counterId: null,
      counterTarget: null,
      counterValue: null,
      bonus: null,
      bonusId: null,
    };
    const optimoveDepositTransaction = mapOptimoveDeposit(deposit);
    expect(optimoveDepositTransaction).to.deep.equal({
      TransactionID: deposit.paymentId,
      PlayerID: deposit.playerId,
      TransactionType: 'deposit',
      TransactionDate: timestamp,
      TransactionAmount: deposit.amount,
      Status: 'created',
      Platform: '',
    });
  });

  it('maps withdrawal to an Optimove Transaction', () => {
    const withdrawal: Withdrawal = {
      paymentId: 100000028,
      transactionKey: 'd3e771b0-a467-11ec-9fb5-95c0f6e21bfb',
      timestamp,
      playerId: 3000001,
      accountId: 1000013,
      amount: 3000,
      status: 'complete',
      account: '',
      paymentParameters: null,
      accountParameters: {},
      paymentMethodName: 'BankTransfer',
      paymentProvider: 'Directa24',
      paymentFee: 0,
      username: '',
    };
    const optimoveWithdrawalTransaction = mapOptimoveWithdrawal(withdrawal);
    expect(optimoveWithdrawalTransaction).to.deep.equal({
      TransactionID: withdrawal.paymentId,
      PlayerID: withdrawal.playerId,
      TransactionType: 'withdraw',
      TransactionDate: timestamp,
      TransactionAmount: withdrawal.amount,
      Status: withdrawal.status,
      Platform: '',
    });
  });

  it('maps game round to an Optimove Game', () => {
    const gameRound: GameRoundForOptimove = {
      gameRoundId: 1000000002,
      timestamp,
      game: {
        gameId: 1,
        name: 'Jungle Spirit',
        profile: 'Slots',
      },
      playerId: 3000002,
      transactions: [
        {
          amount: 800,
          bonusAmount: 0,
          gameRoundId: 1000000002,
          transactionId: 10000000004,
          type: 'bet',
          balance: 200,
          bonusBalance: 1000,
          currencyId: 'EUR',
          bonusBalanceUsed: false,
        },
        {
          amount: 200,
          bonusAmount: 600,
          gameRoundId: 1000000002,
          transactionId: 10000000005,
          type: 'bet',
          balance: 0,
          bonusBalance: 400,
          currencyId: 'EUR',
          bonusBalanceUsed: true,
        },
        {
          amount: 0,
          bonusAmount: 200,
          gameRoundId: 1000000002,
          transactionId: 10000000006,
          type: 'bet',
          balance: 0,
          bonusBalance: 200,
          currencyId: 'EUR',
          bonusBalanceUsed: true,
        },
        {
          amount: 0,
          bonusAmount: 10000,
          gameRoundId: 1000000002,
          transactionId: 10000000007,
          type: 'win',
          balance: 0,
          bonusBalance: 10200,
          currencyId: 'EUR',
          bonusBalanceUsed: true,
        },
      ],
    };
    const optimoveGame = mapOptimoveGameWithGameType(gameRound);
    expect(optimoveGame).to.deep.equal({
      GameRoundID: gameRound.gameRoundId,
      GameDate: timestamp,
      GameID: gameRound.game.gameId,
      PlayerID: gameRound.playerId,
      Platform: '',
      RealBetAmount: 1000,
      RealWinAmount: 0,
      BonusBetAmount: 800,
      BonusWinAmount: 10000,
      NetGamingRevenue: -10200,
      NumberofRealBets: 2,
      NumberofBonusBets: 2,
      NumberofRealWins: 0,
      NumberofBonusWins: 1,
      GameType: {
        GameID: gameRound.game.gameId,
        GameName: gameRound.game.name,
        GameCategory: gameRound.game.profile,
      },
    });
  });
});
