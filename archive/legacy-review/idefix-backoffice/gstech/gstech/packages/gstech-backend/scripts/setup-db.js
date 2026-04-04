// @flow
require('flow-remove-types/register');
const { setupPlayers } = require('./utils/db');

setupPlayers()
  .then(() => {
    console.log('Setup complete'); // eslint-disable-line
    process.exit();
  }).catch((error) => {
    console.trace('setup failed', error);  // eslint-disable-line
    process.exit(1);
  });
