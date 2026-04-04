/* @flow */

import type { CMoney } from 'gstech-core/modules/money-class';
import type { DepositDetails, Player } from '../common/api';

// eslint-disable-next-line no-unused-vars
const register = async (user: Player, req: express$Request) => {
};

// eslint-disable-next-line no-unused-vars
const deposit = async (user: Player, req: express$Request, value: CMoney, tags: string[], depositDetails: DepositDetails) => {
};

module.exports = {
  register, deposit
};
