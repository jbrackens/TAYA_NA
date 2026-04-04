/* @flow */
const moment = require('moment-timezone');

const { generatePin } = require('gstech-core/modules/crypt');
const { upsert } = require('gstech-core/modules/knex');

export type PinType = 'activate' | 'login' | 'reset';

const createPin = async (knex: Knex, mobilePhone: string, pinType: PinType, expireTimeInHours: number): Promise<string> => {
  const [existingPin] = await knex('player_pins')
    .where({ pinType, mobilePhone })
    .whereRaw('"expires" >= now() + \'10 minutes\'::interval');

  if (existingPin) return existingPin.pinCode;

  const pinCode = generatePin(6);
  const result = await upsert(knex, 'player_pins', 'mobilePhone', {
    mobilePhone,
    pinCode,
    pinType,
    expires: moment().add(expireTimeInHours, 'hours').toDate(),
  });

  return result.pinCode;
};

const validatePin = async (knex: Knex, mobilePhone: string, pinCode: string, pinType: PinType): Promise<boolean> => {
  const rows = await knex('player_pins')
    .where({ pinCode, pinType, mobilePhone })
    .whereRaw('"expires" >= now()')
    .delete()
    .returning('*');

  return rows.length > 0;
};

const deleteExpired = async (knex: Knex): Promise<number> => {
  const rows = await knex('player_pins')
    .whereRaw('"expires" < now()')
    .delete()
    .returning('*');

  return rows.length;
};

module.exports = { createPin, validatePin, deleteExpired };
