/* @flow */

export type BetbyError = {
  code: number,
  message: string,
};

const BBY_100_UNKNOWN_ERROR: BetbyError = { code: 100, message: 'Unknown error' };

const BBY_500_INTERNAL_SERVER_ERROR: BetbyError = { code: 500, message: 'Internal server error' };
//
const BBY_1001_KEY_NOT_FOUND: BetbyError = { code: 1001, message: 'Key not found' };
const BBY_1002_ATTEMPT_TO_REUSE_THE_KEY: BetbyError = { code: 1002, message: 'Attempt to reuse the key' };
const BBY_1003_KEY_IS_EXPIRED: BetbyError = { code: 1003, message: 'Key is expired' };
const BBY_1004_IP_ADDRESS_DOES_NOT_MATCH: BetbyError = { code: 1004, message: 'IP address does not match' };
const BBY_1005_PLAYER_IS_BLOCKED: BetbyError = { code: 1005, message: 'Player is blocked' };
const BBY_1006_PLAYER_IS_NOT_FOUND: BetbyError = { code: 1006, message: 'Player is not found' };
const BBY_1007_SESSION_IS_EXPIRED: BetbyError = { code: 1007, message: 'Session is expired' };
//
const BBY_2001_NOT_ENOUGH_MONEY: BetbyError = { code: 2001, message: 'Not enough money' };
const BBY_2002_INVALID_CURRENCY: BetbyError = { code: 2002, message: 'Invalid currency' };
const BBY_2003_PARENT_TRANSACTION_NOT_FOUND: BetbyError = { code: 2003, message: 'Parent transaction not found' };
const BBY_2004_BAD_REQUEST: BetbyError = { code: 2004, message: 'Bad request' };
const BBY_2005_INVALID_JWT_TOKEN: BetbyError = { code: 2005, message: 'Invalid JWT token' };
//
const BBY_3001_BONUS_NOT_FOUND: BetbyError = { code: 3001, message: 'Bonus not found' };
//
const BBY_4001_PLAYER_LIMITS_EXCEEDED: BetbyError = { code: 4001, message: 'Player limits exceeded' };
const BBY_4002_MAXIMUM_BONUS_BET_LIMIT_EXCEEDED: BetbyError = { code: 4002, message: 'Maximum bonus bet limit exceeded' };


module.exports = {
  BBY_100_UNKNOWN_ERROR,
  BBY_500_INTERNAL_SERVER_ERROR,
  BBY_1001_KEY_NOT_FOUND,
  BBY_1002_ATTEMPT_TO_REUSE_THE_KEY,
  BBY_1003_KEY_IS_EXPIRED,
  BBY_1004_IP_ADDRESS_DOES_NOT_MATCH,
  BBY_1005_PLAYER_IS_BLOCKED,
  BBY_1006_PLAYER_IS_NOT_FOUND,
  BBY_1007_SESSION_IS_EXPIRED,
  BBY_2001_NOT_ENOUGH_MONEY,
  BBY_2002_INVALID_CURRENCY,
  BBY_2003_PARENT_TRANSACTION_NOT_FOUND,
  BBY_2004_BAD_REQUEST,
  BBY_2005_INVALID_JWT_TOKEN,
  BBY_3001_BONUS_NOT_FOUND,
  BBY_4001_PLAYER_LIMITS_EXECEEDED: BBY_4001_PLAYER_LIMITS_EXCEEDED,
  BBY_4002_MAXIMUM_BONUS_BET_LIMIT_EXCEEDED
};