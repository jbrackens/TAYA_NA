/* @flow */
const pg = require('gstech-core/modules/pg');

const cleanTickets = async () => {
  await pg('winning').delete();
  await pg('ticket_line').delete();
  await pg('ticket').delete();
};

const cleanDrawings = async () => {
  await pg('payout').delete();
  await pg('drawing').delete();
};

const cleanGameTypes = async () => {
  await pg('drawing_schedule').delete();
  await pg('ticket_price').delete();
  await pg('free_line').delete();
  await pg('game_type').delete();
};

module.exports = {
  cleanTickets,
  cleanDrawings,
  cleanGameTypes,
};
