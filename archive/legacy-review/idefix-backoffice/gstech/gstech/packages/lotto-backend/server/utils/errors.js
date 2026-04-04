/* @flow */
const handleError = async (err: any, res: express$Response) => {
  res.status(err.httpcode ? err.httpcode : 500);
  res.json({ message: err.clientMessage ? err.clientMessage : 'general.error' });
};

const formatError = (message: string, httpcode: number, clientMessage: any): Error => {
  const e: any = new Error(message);
  e.httpcode = httpcode;
  e.clientMessage = clientMessage;

  return e;
};

const gameNotFound = (gametypeid: string): Error => formatError(`Game '${gametypeid}' not found`, 404, 'general.error');
const noPriceForGame = (gametypeid: string | number, currrency: string): Error => formatError(`${gametypeid} is not accepting bets in ${currrency}`, 500, 'general.error');
const betRollbackFailed = (playerId: number): Error => formatError(`Bet rollback failed for player '${playerId}'`, 500, 'general.error');
const unknownRequest = (requestType: string): Error => formatError(`Unknown request_type '${requestType}'`, 400, 'general.error');
const buyTicketFailed = (message: string): Error => formatError(message, 400, 'general.error');
const notEnoughMoney = (price: number | string, currency: string): Error => formatError(`You don't have enough money to buy a ticket. Ticket price is ${price} ${currency}`, 400, 'general.error.nomoney');
const notOpenForBetsTryLater = (message: string): Error => formatError(message, 400, 'general.cutoffpassed');
const notAuthorized = (): Error => formatError('Not Authorized', 401, null);

module.exports = {
  gameNotFound,
  noPriceForGame,
  betRollbackFailed,
  unknownRequest,
  buyTicketFailed,
  notEnoughMoney,
  notOpenForBetsTryLater,
  notAuthorized,
  handleError,
};
