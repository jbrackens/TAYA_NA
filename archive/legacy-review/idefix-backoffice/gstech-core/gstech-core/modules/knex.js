/* @flow */
const util = require('util');
const _ = require('lodash');

const upsert = async (knex: Knex, tableName: string, fieldName: string, obj: any) => {
  const insert = knex(tableName).insert(obj).toString();
  const update = knex(tableName).update(obj).whereRaw(`${tableName}."${fieldName}" = '${obj[fieldName]}'`);
  const query = util.format(
    `%s ON CONFLICT ("${fieldName}") DO UPDATE SET %s returning *`,
    insert.toString(),
    update.toString().replace(/^update\s.*\sset\s/i, ''),
  );

  const result = await knex.raw(query);
  return result.rows[0];
};

const upsert2 = async (knex: Knex, tableName: string, obj: any, keys: string[], updateIgnore: string[] = []) => {
  const relevantFields = _.difference(_.keys(_.omit(obj, keys)), updateIgnore);
  const keyPlaceholders = new Array(keys.length).fill('??').join(',');
  const updateFields = relevantFields.length > 0 ? relevantFields : keys;

  const insert = knex(tableName).insert(obj);
  const update = knex.update(_.pick(obj, updateFields));

  const result = await knex.raw(`? ON CONFLICT (${keyPlaceholders}) DO ? RETURNING *`, [insert, ...keys, update]);
  return result.rows[0];
};

module.exports = {
  upsert,
  upsert2,
};
