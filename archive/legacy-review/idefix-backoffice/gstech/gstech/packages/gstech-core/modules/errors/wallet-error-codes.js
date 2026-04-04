/* @flow */

const errors: { [key: string]: GSError } = {
  PLAYER_NOT_FOUND: { code: 10001, message: 'Player not found' },
  BET_FAILED: { code: 10002, message: 'Bet failed - general error' },
  WIN_FAILED: { code: 10003, message: 'Win failed - general error' },
  SESSION_NOT_ACTIVE: { code: 10004, message: 'Session not active' },
  GAME_NOT_FOUND: { code: 10005, message: 'Game not found' },
  BET_FAILED_NO_BALANCE: { code: 10006, message: 'Bet failed, no enough balance' },
  CANCEL_FAILED: { code: 10007, message: 'Cancel transaction failed' },
  PLAY_LIMIT_REACHED: { code: 10008, message: 'Bet failed because of play limit' },
  PLAY_BLOCKED: { code: 10009, message: 'Bet failed because of game play blocked' },
  INVALID_CURRENCY: { code: 10010, message: 'Invalid currency' },
};

module.exports = errors;
