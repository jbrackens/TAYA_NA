/* @flow */
const ds = require('../server/common/datastorage');
const settings = require('../server/common/settings');

const updateInitialData = async () => {
  await ds.init();
  await settings.init();
  process.exit(0);
};
updateInitialData();
