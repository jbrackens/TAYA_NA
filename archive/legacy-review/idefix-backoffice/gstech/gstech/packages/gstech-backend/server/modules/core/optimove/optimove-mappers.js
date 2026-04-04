/* @flow */
import type { Deposit, Withdrawal } from 'gstech-core/modules/types/backend';
import type { RawTransaction } from "../../game_round/GameRound";
import type { PlayerForOptimove, GameRoundForOptimove, GameForOptimove } from './repository';
import type {
  OptimoveCustomer,
  OptimoveTransaction,
  OptimoveGameType,
  OptimoveGameWithGameType,
} from './optimove-types';

const _ = require('lodash');

const ngrReportingFields = (txs: Array<RawTransaction>): {
  RealBetAmount: Money,
  RealWinAmount: Money,
  BonusBetAmount: Money,
  BonusWinAmount: Money,
  NetGamingRevenue: Money,
} => {
  const RealBetAmount = _.sumBy(_.filter(txs, { type: 'bet' }), 'amount');
  const RealWinAmount = _.sumBy(_.filter(txs, { type: 'win' }), 'amount');
  const BonusBetAmount = _.sumBy(_.filter(txs, { type: 'bet' }), 'bonusAmount');
  const BonusWinAmount = _.sumBy(_.filter(txs, { type: 'win' }), 'bonusAmount');
  // NGR=(Win-Bet)-(bonusWin-bonusBet)
  const NetGamingRevenue = RealWinAmount - RealBetAmount - (BonusWinAmount - BonusBetAmount);
  return {
    RealBetAmount,
    RealWinAmount,
    BonusBetAmount,
    BonusWinAmount,
    NetGamingRevenue,
  };
};

const mapOptimoveCustomer = (player: PlayerForOptimove): OptimoveCustomer => ({
  PlayerID: player.id,
  RegisteredDate: player.createdAt,
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
  ExclusionLimit: _.includes(player.activeLimits, 'exclusion'),
  TimeoutLimit: _.includes(player.activeLimits, 'timeout'),
  ...(player.balance ? { Balance: player.balance } : Object.freeze({})),
});

const mapOptimoveDeposit = (deposit: Deposit): OptimoveTransaction => ({
  TransactionID: deposit.paymentId,
  PlayerID: deposit.playerId,
  TransactionType: 'deposit',
  TransactionDate: deposit.timestamp,
  TransactionAmount: deposit.amount,
  Status: deposit.status,
  Platform: '', // todo: resolve this -> possibly using sessionId and userAgent
});

const mapOptimoveWithdrawal = (withdrawal: Withdrawal): OptimoveTransaction => ({
  TransactionID: withdrawal.paymentId,
  PlayerID: withdrawal.playerId,
  TransactionType: 'withdraw',
  TransactionDate: withdrawal.timestamp,
  TransactionAmount: withdrawal.amount,
  Status: withdrawal.status,
  Platform: '', // todo: resolve this -> possibly using sessionId and userAgent
});

const mapOptimoveGameType = ({ gameId, name, profile }: GameForOptimove): OptimoveGameType => ({
  GameID: gameId,
  GameName: name,
  GameCategory: profile,
});

const mapOptimoveGameWithGameType = ({
  gameRoundId,
  timestamp,
  game,
  playerId,
  transactions: txs,
}: GameRoundForOptimove): OptimoveGameWithGameType => ({
  GameRoundID: gameRoundId,
  GameDate: timestamp,
  GameID: game.gameId,
  PlayerID: playerId,
  Platform: '',
  ...ngrReportingFields(txs),
  NumberofRealBets: _.filter(txs, (t) => t.type === 'bet' && t.amount > 0).length,
  NumberofBonusBets: _.filter(txs, (t) => t.type === 'bet' && t.bonusAmount > 0).length,
  // // NumberofSessions?: Integer,
  NumberofRealWins: _.filter(txs, (t) => t.type === 'win' && t.amount > 0).length,
  NumberofBonusWins: _.filter(txs, (t) => t.type === 'win' && t.bonusAmount > 0).length,
  GameType: mapOptimoveGameType(game),
});

module.exports = {
  mapOptimoveCustomer,
  mapOptimoveDeposit,
  mapOptimoveWithdrawal,
  mapOptimoveGameWithGameType,
};
