// @flow
const pg = require('gstech-core/modules/pg');

module.exports = async () => {
  await pg('game_progresses').delete();
  await pg('progresses_rewards').delete();
  await pg('progresses_ledgers').delete();
  await pg('progresses').delete();
  await pg('ledgers_events').delete();
  await pg('ledgers').delete();
  await pg('rewards').delete();
  await pg('games').delete();
  await pg('thumbnails').delete();
  await pg('reward_definitions').delete();
};
