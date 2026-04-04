/* @flow */
const util = require('util');
const _ = require('lodash');
const range = require('postgres-range');

const serializeDateRange = ({ start, end }: Interval): string =>
  range.serialize(new range.Range(start, end, range.RANGE_LB_INC), (d) => d.toISODate());

const upsert = async (knex: Knex, tableName: string, fieldName: string, obj: any): Promise<any> => {
  const insert = knex(tableName).insert(obj).toString();
  const update = knex(tableName)
    .update(obj)
    .whereRaw(`${tableName}."${fieldName}" = '${obj[fieldName]}'`);
  const query = util.format(
    `%s ON CONFLICT ("${fieldName}") DO UPDATE SET %s returning *`,
    insert.toString(),
    update.toString().replace(/^update\s.*\sset\s/i, ''),
  );

  const result = await knex.raw(query);
  return result.rows[0];
};

const upsert2 = async (
  knex: Knex,
  tableName: string,
  obj: any,
  keys: string[],
  updateIgnore: string[] = [],
  rawConstraintWhere: string = '',
): Promise<any> => {
  const relevantFields = _.difference(_.keys(_.omit(obj, keys)), updateIgnore);
  const keyPlaceholders = new Array<'??'>(keys.length).fill('??').join(',');
  const updateFields = relevantFields.length > 0 ? relevantFields : keys;

  const insert = knex(tableName).insert(obj);
  const update = knex.update(_.pick(obj, updateFields));

  const query = knex.raw(
    `? ON CONFLICT (${keyPlaceholders}) ${rawConstraintWhere} DO ? RETURNING *`,
    [insert, ...keys, update],
  );
  const result = await query;
  return result.rows[0];
};

const upsert2Query = (
  knex: Knex,
  tableName: string,
  obj: any,
  keys: string[],
  updateIgnore: string[] = [],
  rawConstraintWhere: string = '',
): Knex$Raw<any> => {
  const relevantFields = _.difference(_.keys(_.omit(obj, keys)), updateIgnore);
  const keyPlaceholders = new Array<'??'>(keys.length).fill('??').join(',');
  const updateFields = relevantFields.length > 0 ? relevantFields : keys;

  const insert = knex(tableName).insert(obj);
  const update = knex.update(_.pick(obj, updateFields));

  return knex.raw(`? ON CONFLICT (${keyPlaceholders}) ${rawConstraintWhere} DO ? RETURNING *`, [
    insert,
    ...keys,
    update,
  ]);
};

module.exports = {
  upsert,
  upsert2,
  upsert2Query,
  serializeDateRange,
};
