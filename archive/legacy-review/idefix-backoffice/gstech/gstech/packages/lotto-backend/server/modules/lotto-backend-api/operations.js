/* @flow */
import type { PlayerWithBalance, GameRoundResult, BetRequest } from 'gstech-core/modules/clients/backend-wallet-api';
import type { Player } from 'gstech-core/modules/types/player';

import type { Game, Balances, TicketRequest, GameResult, PayoutTable } from './types';
import type { TicketDraft, GameInfo, TicketLine, TicketLineDraft, RawGameResult, TicketPrice } from '../../db/types';
import type { BetResponse } from '../../lotto-warehouse-client/types';

const _ = require('lodash');

const client = require('gstech-core/modules/clients/backend-wallet-api');
const money = require('gstech-core/modules/money');
const logger = require('gstech-core/modules/logger');

const db = require('../../db');
const errors = require('../../utils/errors');
const lottoClient = require('../../lotto-warehouse-client');

const po = require('./payoutsHardcode');

const getPlayer = async (sessionId: string): Promise<PlayerWithBalance> => {
  const { player } = await client.getPlayerBySession('LW', sessionId);
  return player;
};

const getBalances = async (player: {...Player, ...}, gameTypeId: number): Promise<Balances> => {
  const playerBalance = await client.getBalance(player.id);
  const freeLines = await db.getPlayerFreeLines(player.id, gameTypeId);

  const balances: Balances = {
    balance: playerBalance.balance,
    currency: playerBalance.currencyId,
    freelines: freeLines ? freeLines.freelinescount : 0,
  };

  return balances;
};

const createBet = (brandId: string, playerId: number, sessionId: string, gameId: string, lines: TicketLine[]): Promise<GameRoundResult[]> => Promise.all(lines.map((line) => {
  const betRequest: BetRequest = {
    brandId,
    manufacturer: 'LW',
    closeRound: false,
    amount: line.price,
    game: gameId,
    gameRoundId: `${playerId}${line.lineid}`,
    transactionId: `${playerId}${line.lineid}`,
    timestamp: new Date(),
    wins: undefined,
    sessionId,
  };

  return client.bet(playerId, betRequest);
}));

const cancelBet = (brandId: string, playerId: number, lines: TicketLine[]) => Promise.all(lines.map((line) => {
  const cancelRequest = {
    brandId,
    manufacturer: 'LW',
    transactionId: `${playerId}${line.lineid}`,
    gameRoundId: `${playerId}${line.lineid}`,
    amount: line.price,
    timestamp: new Date(),
  };

  return client.cancelTransaction(playerId, cancelRequest);
}));

const createLottoBet = (player: { ...Player, ...}, gameTypeId: number, drawings: number, lines: TicketLine[], ipAddress: string): Promise<BetResponse> => {
  const betRequest = {
    userid: player.id,
    birthdate: player.dateOfBirth,
    countrycode: player.countryId,
    ipaddress: ipAddress,
    currency: player.currencyId,
    lines: lines.map((line) => {
      const numbers = line.betnumbers.map(number => ({ number, type: 'number' }));
      const bonusnumbers = line.betbonusnumbers.map(number => ({ number, type: 'bonusnumber' }));
      return {
        id: Number(`${player.id}${line.lineid}`),
        gametypeid: gameTypeId,
        drawings,
        numbers: [...numbers, ...bonusnumbers],
      };
    }),
  };
  logger.debug('placing a bet on lotto side:', betRequest);
  return lottoClient.createBet(betRequest);
};

const createTicket = async (player: { ...Player, ...}, sessionId: string, ticketRequest: TicketRequest, gameTypeId: number, price: number, freeLinesCount: number): Promise<TicketLine[]> => {
  const ticketDraft: TicketDraft = {
    username: player.username,
    playerid: player.id,
    gametypeid: gameTypeId,
    currency: player.currencyId,
    drawings: ticketRequest.drawings,
    purchasedate: new Date(),
  };

  const ticket = await db.createTicket(ticketDraft);
  return Promise.all(ticketRequest.details.map((detail) => {
    const lineDraft: TicketLineDraft = {
      ticketid: ticket.ticketid,
      price: freeLinesCount-- > 0 ? 0 : price, // eslint-disable-line
      ...detail,
    };

    return db.createTicketLine(lineDraft);
  }));
};

const getTicketPrice = async (gameTypeId: number, currencyId: string): Promise<TicketPrice> => {
  const ticketPrice = await db.getTicketPrice(gameTypeId, currencyId);
  if (!ticketPrice) {
    throw errors.noPriceForGame(gameTypeId, currencyId);
  }
  return ticketPrice;
};

const getGame = async (player: PlayerWithBalance, gameId: string): Promise<Game> => {
  const gametype: GameInfo = await db.getGameTypeByGameId(gameId);
  if (!gametype || !gametype.isplayable) {
    throw errors.gameNotFound(gameId);
  }

  const price = await getTicketPrice(gametype.gametypeid, player.currencyId);
  const lottoCurrency = await db.getCurrency(gametype.currency);
  const playerCurrency = await db.getCurrency(player.currencyId);

  const game: Game = {
    ...gametype,
    priceperrow: price.priceperrow,
    symbol: player.currencyId,
    locale: player.languageId,
    currentjackpot: Math.round((gametype.currentjackpot / Number(lottoCurrency.fx_rate)) * Number(playerCurrency.fx_rate)),
  };

  return game;
};

const getPayoutTable = async (player: { ...Player, ...}, gameId: string): Promise<PayoutTable> => {
  // const gametype: GameInfo = await db.getGameTypeByGameId(gameId);
  // if (!gametype || !gametype.isplayable) {
  //   throw errors.gameNotFound(gameId);
  // }

  // const payouts = await db.getPayoutTable(gametype.nextdrawid);
  const payouts: any = po.payoutTables.filter(item => item.gameId === gameId);

  if (!payouts[0]) {
    throw errors.gameNotFound(gameId);
  }

  const payoutTable: PayoutTable = await Promise.all(payouts[0].payoutTable.map(payout => ({
    sortOrder: payout.sortorder,
    match: `${payout.numbers}+${payout.bonusnumbers}`,
    winningOdds: `1:${payout.probability}`,
  })));

  return payoutTable;
};

const buyTicket = async (player: PlayerWithBalance, sessionId: string, ticket: TicketRequest, ipAddress: string): Promise<Balances> => {
  const game = await getGame(player, ticket.gameid);
  const price = await getTicketPrice(game.gametypeid, player.currencyId);
  const freeLines = await db.getPlayerFreeLines(player.id, game.gametypeid);
  const freeLinesCount = freeLines ? freeLines.freelinescount : 0;

  const hasEnoughMoney = player.realBalance - (price.priceperrow * (ticket.details.length - freeLinesCount)) >= 0;
  if (!hasEnoughMoney) {
    throw errors.notEnoughMoney(money.formatMoney(price.priceperrow), player.currencyId);
  }

  const lines = await createTicket(player, sessionId, ticket, game.gametypeid, price.priceperrow, freeLinesCount);
  const usedLines = Math.min(freeLinesCount, lines.length);
  await db.decrementPlayerFreeLines({ playerid: player.id, gametypeid: game.gametypeid, freelinescount: usedLines });

  try {
    await createBet(player.brandId, player.id, sessionId, ticket.gameid, lines);
    await createLottoBet(player, game.gametypeid, ticket.drawings, lines, ipAddress);

    return await getBalances(player, game.gametypeid);
  } catch (e) {
    try {
      await db.deleteTicket(lines[0].ticketid);
      await db.incrementPlayerFreeLines({ playerid: player.id, gametypeid: game.gametypeid, freelinescount: usedLines });
      await cancelBet(player.brandId, player.id, lines);
    } catch (e2) {
      throw errors.betRollbackFailed(player.id);
    }

    if (e.message.includes('not open for new bets right now')) {
      throw errors.notOpenForBetsTryLater(e.message);
    }

    throw errors.buyTicketFailed(e.message);
  }
};

const getTickets = async (player: PlayerWithBalance): Promise<GameResult[]> => {
  const gamesResults = await db.getGameResults(player.id);
  const results = await Promise.all(_.reverse(_.values(_.groupBy(gamesResults, 'ticketid'))).map(async (ticketLines) => {
    const ticket: RawGameResult = ticketLines[0];
    const lottoCurrency = await db.getCurrency(ticket.currency);
    const playerCurrency = await db.getCurrency(player.currencyId);
    return {
      gameName: ticket.name,
      gameDate: ticket.drawdateutc,
      price: _.sumBy(ticketLines, 'price'),
      purchasedate: ticket.purchasedate,
      currency: player.currencyId,
      totalwin: _.sumBy(ticketLines, 'payoutusercurrency'),
      winningnumbers: ticket.numbers,
      winningbonusnumbers: ticket.bonusnumbers,
      currentjackpot: Math.round((ticket.currentjackpot / Number(lottoCurrency.fx_rate)) * Number(playerCurrency.fx_rate)),
      details: ticketLines.map(t =>
        ({
          numbers: t.betnumbers,
          bonusnumbers: t.betbonusnumbers,
          win: t.payoutusercurrency,
        })),
    };
  }));

  return results;
};

module.exports = {
  getPlayer,
  getBalances,
  getGame,
  getPayoutTable,
  buyTicket,
  getTickets,
};
