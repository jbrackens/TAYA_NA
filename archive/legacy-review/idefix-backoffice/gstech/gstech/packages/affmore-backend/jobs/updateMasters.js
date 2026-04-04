// @flow
require('flow-remove-types/register');

const pg = require('gstech-core/modules/pg');

const updateMasters = async () => {
  await pg('affiliates').update({ masterId: 1000111 }).where({ id: 1002400 });
  await pg('affiliates').update({ masterId: 1000111 }).where({ id: 1002284 });
};

module.exports = updateMasters;
