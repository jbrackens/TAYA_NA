// @flow
const pg = require('gstech-core/modules/pg');
const fs = require('fs-extra');
const path = require('path');

module.exports = async () => {
  const file = await fs.readFile(path.join(__dirname, '/rewardserver.sql'));
  await pg.raw(file.toString());
};
