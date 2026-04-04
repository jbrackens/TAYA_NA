/* @flow */

const hstore = require('pg-hstore')();

const pg = require('gstech-core/modules/pg');
const { setTypeParser } = require('gstech-core/modules/utils');

const { init } = require('./server/workers');

(async () => {
  await pg.raw("select setval('campaigns_content_id_seq', 100)");
  await pg.raw("select setval('campaigns_id_seq', 100)");
  await pg.raw("select setval('content_type_id_seq', 100)");
  await pg.raw("select setval('content_id_seq', 100)");
  await init();

  pg('pg_type').select('oid').where({ typname: 'hstore' }).first()
    .then(({ oid }) =>
      setTypeParser(oid, value => // hstore
        Object.keys(hstore.parse(value)).reduce((acc, curr) => {
          acc.push(curr);
          return acc;
        }, [])));
})();
