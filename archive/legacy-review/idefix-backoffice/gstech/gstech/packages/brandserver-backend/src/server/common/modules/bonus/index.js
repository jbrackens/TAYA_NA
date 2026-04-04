/* @flow */
import type { Bonus } from '../../api';

const api = require('../../api');
const { mapBonuses } = require('./helper');

const getAvailableBonus = (req: express$Request): Promise<Bonus[]> => api.TransactionGetApplicableDepositBonuses({ sessionKey: req.session.SessionKey }).then(bonuses => mapBonuses(req, bonuses));

module.exports = { getAvailableBonus };
