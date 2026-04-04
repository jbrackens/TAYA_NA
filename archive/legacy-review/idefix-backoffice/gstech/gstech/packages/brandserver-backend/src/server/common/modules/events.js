/* @flow */
import type {Player, Deposit} from "../api";

let _events;

module.exports = (): {
  processDeposit: (req: express$Request, d: Deposit) => Promise<void>,
  register: (req: express$Request, user: Player) => Promise<any>,
  startGame: (req: express$Request, gameID: string) => Promise<void>,
  startGameForFun: (req: express$Request, gameID: string) => Promise<void>,
} => {
  if (_events == null) {
    _events = require('../events');
  }
  return _events;
};
