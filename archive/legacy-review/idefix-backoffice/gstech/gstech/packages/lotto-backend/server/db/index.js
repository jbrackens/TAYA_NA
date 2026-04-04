/* @flow */
import type {
  Currency,
  GameType,
  GameTypeUpdate,
  GameTypeDraft,
  GameInfo,
  TicketPrice,
  Drawing,
  DrawingSchedule,
  DrawingBase,
  Payout,
  PayoutDraft,
  Ticket,
  TicketDraft,
  TicketLine,
  TicketLineDraft,
  TicketLineUpdate,
  Winning,
  RawGameResult,
  FreeLine,
  ExternalTicket,
} from './types';
import type { DrawingUpdate } from '../modules/lotto-warehouse-api/types';

const pg = require('gstech-core/modules/pg');
const { upsert } = require('gstech-core/modules/knex');

const getGameTypes = (): Knex$QueryBuilder<GameType[]> =>
  pg('game_type')
    .whereNotNull('gameid')
    .orderBy('gametypeid');

const getGameType = (gameTypeId: number): Knex$QueryBuilder<GameInfo> =>
  pg('game_type')
    .first('game_type.gametypeid', 'game_type.name', 'game_type.cutoffhours', 'game_type.currency', 'game_type.country', 'game_type.isplayable', 'game_type.numberscount', 'game_type.extranumberscount', 'game_type.bonusnumberscount', 'game_type.refundnumberscount', 'game_type.numbermin', 'game_type.numbermax', 'game_type.bonusnumbermin', 'game_type.bonusnumbermax', 'game_type.refundnumbermin', 'game_type.refundnumbermax', 'game_type.currentjackpot', 'game_type.nextdrawid', 'game_type.gameid', 'game_type.numbersperrow', 'game_type.bonusnumbersperrow', 'drawing.drawdatelocal')  
    .innerJoin('drawing', 'drawing.drawid', 'game_type.nextdrawid')
    .where({ 'game_type.gametypeid': gameTypeId });

const getGameTypeByGameId = (gameId: string): Knex$QueryBuilder<GameInfo> =>
  pg('game_type')
    .first('game_type.gametypeid', 'game_type.name', 'game_type.cutoffhours', 'game_type.currency', 'game_type.country', 'game_type.isplayable', 'game_type.numberscount', 'game_type.extranumberscount', 'game_type.bonusnumberscount', 'game_type.refundnumberscount', 'game_type.numbermin', 'game_type.numbermax', 'game_type.bonusnumbermin', 'game_type.bonusnumbermax', 'game_type.refundnumbermin', 'game_type.refundnumbermax', 'game_type.currentjackpot', 'game_type.nextdrawid', 'game_type.gameid', 'game_type.numbersperrow', 'game_type.bonusnumbersperrow', 'drawing.drawdateutc', 'drawing.cutoff')  
    .innerJoin('drawing', 'drawing.drawid', 'game_type.nextdrawid')
    .where({ 'game_type.gameid': gameId });

const upsertGameType = (gameType: { ...GameTypeDraft, ...GameTypeUpdate }): Promise<GameType> =>
  upsert(pg, 'game_type', 'gametypeid', gameType);

const upsertGameTypeUdpate = (gameType: GameTypeDraft): Promise<GameType> =>
  upsert(pg, 'game_type', 'gametypeid', gameType);

// This method should only be used by unit tests
const insertGameId = (gameType: any): Promise<GameType> =>
  pg.raw(`UPDATE game_type SET gameid = '${gameType.gameid}' where gametypeid = ${gameType.gametypeid}`)
    .then(result => result.rows);

const getTicketPrice = (gameTypeId: number, currencyCode: string): Knex$QueryBuilder<TicketPrice> =>
  pg('ticket_price')
    .first('*')
    .where({ gametypeid: gameTypeId, currencycode: currencyCode });

const upsertTicketPrice = (ticketPrice: TicketPrice): Promise<TicketPrice> =>
  pg('ticket_price')
    .insert(ticketPrice)
    .returning('*')
    .then(([t]) => t); // TODO: remove array?

const getCurrency = (currencyCode: string): Knex$QueryBuilder<Currency> =>
  pg('currency')
    .first('*')
    .where({ currency_code: currencyCode });

const upsertCurrency = (currency: Currency): Promise<Currency> =>
  upsert(pg, 'currency', 'currency_code', currency);

const getPayoutTable = (drawId: number): Knex$QueryBuilder<Payout[]> =>
  pg('payout')
    .where({ drawid: drawId })
    .orderBy('sortorder');

const deletePayout = (drawId: number): Promise<Payout> =>
  pg('payout')
    .where('drawid', drawId)
    .del();

const insertPayout = (payout: { ...PayoutDraft, ... }): Promise<Payout> =>
  pg('payout')
    .insert(payout)
    .returning('*')
    .then(([t]) => t); // TODO: remove array?

const getDrawingSchedule = (gameTypeId: number): Knex$QueryBuilder<DrawingSchedule> =>
  pg('drawing_schedule')
    .first('*')
    .where({ gametypeid: gameTypeId });

const upsertDrawingSchedule = (drawingSchedule: DrawingSchedule): Promise<DrawingSchedule> =>
  upsert(pg, 'drawing_schedule', 'gametypeid', drawingSchedule);

const getDrawing = (drawId: number): Knex$QueryBuilder<Drawing> =>
  pg('drawing')
    .first('*')
    .where({ drawid: drawId });

const getCurrentDrawings = (): Knex$QueryBuilder<Drawing[]> =>
  pg('drawing')
    .select('drawing.drawid')
    .where({ 'drawing.winningscalculated': 0 });

const getDrawingsWithoutPayout = (): Knex$QueryBuilder<Drawing[]> =>
  pg('drawing')
    .select('drawing.drawid')
    .fullOuterJoin('payout', 'payout.drawid', 'drawing.drawid')
    .where({ 'payout.payoutid': null });

const upsertDrawing = (drawing: Drawing): Promise<Drawing> =>
  upsert(pg, 'drawing', 'drawid', drawing);

const upsertDrawingUpdate = (drawing: DrawingUpdate): Promise<Drawing> =>
  upsert(pg, 'drawing', 'drawid', drawing);

const upsertDrawingBase = (drawing: DrawingBase): Promise<Drawing> =>
  upsert(pg, 'drawing', 'drawid', drawing);

const getGameResults = (playerId: number): Promise<RawGameResult[]> =>
   
  pg.raw(`SELECT ticket_line.lineid, ticket.ticketid, game_type.name, drawing.drawdateutc, ticket_line.price, ticket.purchasedate, drawing.numbers, drawing.bonusnumbers, game_type.currentjackpot, ticket_line.betnumbers, ticket_line.betbonusnumbers, winning.payoutusercurrency, game_type.currency FROM ticket_line
  INNER JOIN ticket ON ticket.ticketid = ticket_line.ticketid
  FULL OUTER JOIN winning ON winning.externalid = CONCAT(ticket.playerid, ticket_line.lineid)
  FULL OUTER JOIN drawing ON drawing.drawid = ticket_line.drawid
  FULL OUTER JOIN game_type ON game_type.gametypeid = ticket.gametypeid WHERE ticket.playerid = ${playerId}
  ORDER BY ticket.ticketid DESC, ticket_line.ordernr ASC`)
    .then(result => result.rows);

// const getGameResults = (playerId: number): Knex$QueryBuilder<RawGameResult[]> =>
//   pg('ticket_line')
//     .select('*')
//     .innerJoin('ticket', 'ticket.ticketid', 'ticket_line.ticketid')
//     .fullOuterJoin('winning', 'winning.externalid', 'CAST("ticket"."playerid" AS text)||CAST("ticket_line"."lineid" AS text)')
//     .fullOuterJoin('drawing', 'drawing.drawid', 'winning.drawid')
//     .fullOuterJoin('game_type', 'game_type.gametypeid', 'ticket.gametypeid')
//     .where({ 'ticket.playerid': playerId });

const createTicket = (ticketDraft: TicketDraft): Promise<Ticket> =>
  pg('ticket')
    .insert(ticketDraft)
    .returning('*')
    .then(([t]) => t);

const deleteTicket = (tickedId: number): Promise<Ticket> =>
  pg('ticket')
    .where('ticketid', tickedId)
    .del();

const getTicketLinesWithoutDrawing = (): Knex$QueryBuilder<ExternalTicket[]> =>
  pg('ticket_line')
    .innerJoin('ticket', 'ticket.ticketid', 'ticket_line.ticketid')
    .select('ticket.playerid', 'ticket_line.lineid', 'ticket.username')
    .where({ 'ticket_line.drawid': null });

const getTicketLine = (lineId: number): Knex$QueryBuilder<TicketLine> =>
  pg('ticket_line')
    .first('*')
    .where({ lineid: lineId });

const createTicketLine = (lineDraft: TicketLineDraft): Promise<TicketLine> =>
  pg('ticket_line')
    .insert(lineDraft)
    .returning('*')
    .then(([t]) => t);

const updateTicketLine = (ticket: TicketLineUpdate): Promise<void> =>
  pg('ticket_line')
    .where({ lineid: ticket.lineid })
    .update({ drawid: ticket.drawid });

const upsertWinning = (winning: Winning): Promise<Winning> =>
  upsert(pg, 'winning', 'betid', winning);

const getWinnings = (): Knex$QueryBuilder<Winning[]> =>
  pg('winning')
    .orderBy('betid')
    .select('*');

const getPlayerFreeLines = (playerId: number, gameTypeId: number): Knex$QueryBuilder<FreeLine> =>
  pg('free_line')
    .first('*')
    .where({ playerid: playerId, gametypeid: gameTypeId });

const incrementPlayerFreeLines = (freeLine: FreeLine): Promise<FreeLine> =>
  pg.raw('insert into free_line ("playerid", "gametypeid", "freelinescount") values (?,?,?)'
       + ' on conflict("playerid", "gametypeid") do update set "freelinescount" = free_line."freelinescount" + excluded."freelinescount"'
       + ' returning *', [freeLine.playerid, freeLine.gametypeid, freeLine.freelinescount])
    .then(result => result.rows[0]);

const decrementPlayerFreeLines = (freeLine: FreeLine): Promise<FreeLine> =>
  pg.raw('insert into free_line ("playerid", "gametypeid", "freelinescount") values (?,?,?)'
       + ' on conflict("playerid", "gametypeid") do update set "freelinescount" = free_line."freelinescount" - excluded."freelinescount"'
       + ' returning *', [freeLine.playerid, freeLine.gametypeid, freeLine.freelinescount])
    .then(result => result.rows[0]);

module.exports = {
  getGameTypes,
  getGameType,
  getGameTypeByGameId,
  upsertGameType,
  upsertGameTypeUdpate,
  insertGameId,
  getTicketPrice,
  upsertTicketPrice,
  getCurrency,
  upsertCurrency,
  getPayoutTable,
  deletePayout,
  insertPayout,
  getDrawingSchedule,
  upsertDrawingSchedule,
  getDrawing,
  getCurrentDrawings,
  getDrawingsWithoutPayout,
  upsertDrawing,
  upsertDrawingUpdate,
  upsertDrawingBase,
  getGameResults,
  createTicket,
  deleteTicket,
  getTicketLinesWithoutDrawing,
  getTicketLine,
  createTicketLine,
  updateTicketLine,
  upsertWinning,
  getWinnings,
  getPlayerFreeLines,
  incrementPlayerFreeLines,
  decrementPlayerFreeLines,
};
