/* @flow */
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const {
  players: { testPlayer },
} = require('../../../scripts/utils/db-data');
const Player = require('./Player');

describe.skip('Prohibited Countries Script', () => {

  const prohibitedCountriesPlayerCount = 1000;

  it.skip('creates the user base for the script', async () => {
    await clean.players();
    for (let i = 0; i < prohibitedCountriesPlayerCount; i += 1) {
      await Player.create(testPlayer({ brandId: 'LD' }));
      logger.info(`+++ ProhibitedCountriesScript.spec.js - Created player ${i}`);
    }
    for (let i = 0; i < 5; i += 1) {
      await Player.create(testPlayer({ brandId: 'LD', countryId: 'MT' }));
      logger.info(`+++ ProhibitedCountriesScript.spec.js - Created allowed player ${i}`);
    }
  });

  it.skip('it checks if the correct account were closed', async () => {
    const closedPlayers = await pg('players').where({ accountClosed: true });
    expect(closedPlayers).to.have.lengthOf(prohibitedCountriesPlayerCount);
    const openPlayers = await pg('players').where({ accountClosed: false });
    expect(openPlayers).to.have.lengthOf(5);
  });
});
