// @flow
import type { PinType } from '../../../../types/repository/auth';

const moment = require('moment-timezone');

const { generatePin } = require('gstech-core/modules/crypt');
const { upsert2 } = require('gstech-core/modules/knex');

const createPin = async (knex: Knex, email: string, pinType: PinType, expireTimeInHours: number): Promise<string> => {
  const pinCode = generatePin(6);
  const result = await upsert2(knex, 'pin_codes', {
    email,
    pinCode,
    pinType,
    expires: moment().add(expireTimeInHours, 'hours').toDate(),
  }, ['email']);

  return result.pinCode;
};

const validatePin = async (knex: Knex, email: string, pinCode: string, pinType: PinType): Promise<boolean> => {
  const rows = await knex('pin_codes')
    .where({ pinCode, pinType, email })
    .whereRaw('"expires" >= now()')
    .delete()
    .returning('*');

  return rows.length > 0;
};

const deleteExpiredPins = async (knex: Knex): Promise<number> => {
  const rows = await knex('pin_codes')
    .whereRaw('"expires" < now()')
    .delete()
    .returning('*');

  return rows.length;
};

module.exports = {
  createPin,
  validatePin,
  deleteExpiredPins,
};
