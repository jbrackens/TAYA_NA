/* @flow */
const { cleanTickets, cleanDrawings, cleanGameTypes } = require('./clean-db');

global.clean = {
  tickets: cleanTickets,
  drawings: cleanDrawings,
  gameTypes: cleanGameTypes,
};
