// @flow

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const sample = require('lodash/fp/sample');
const {
  players: { testPlayer },
} = require('./utils/db-data');
const { createPlayer } = require('../server/modules/players');

const fakePlayers = [
  // Americans (USD)
  { firstName: 'John', lastName: 'Smith', dateOfBirth: '1989-02-01', currencyId: 'USD', accountClosed: false, accountSuspended: false, balance: 2_50 },
  { firstName: 'Michael', lastName: 'Johnson', dateOfBirth: '1985-09-23', currencyId: 'USD', accountClosed: true, accountSuspended: true, balance: 3_75 },
  // Accounts with more than 5 EUR
  { firstName: 'David', lastName: 'Brown', dateOfBirth: '1982-11-10', currencyId: 'USD', accountClosed: false, accountSuspended: false, balance: 7_50 },
  { firstName: 'James', lastName: 'Wilson', dateOfBirth: '1979-04-25', currencyId: 'USD', accountClosed: true, accountSuspended: true, balance: 8_25 },

  // Brazilians (BRL)
  { firstName: 'Maria', lastName: 'Santos', dateOfBirth: '1992-05-14', currencyId: 'BRL', accountClosed: false, accountSuspended: false, balance: 12_50 },
  { firstName: 'Lucas', lastName: 'Pereira', dateOfBirth: '1992-03-12', currencyId: 'BRL', accountClosed: true, accountSuspended: true, balance: 18_75 },
  // Accounts with more than 5 EUR
  { firstName: 'Ana', lastName: 'Costa', dateOfBirth: '1995-08-30', currencyId: 'BRL', accountClosed: false, accountSuspended: false, balance: 30_00 },
  { firstName: 'Bruno', lastName: 'Silva', dateOfBirth: '1988-06-12', currencyId: 'BRL', accountClosed: true, accountSuspended: true, balance: 45_50 },

  // Finnish (EUR)
  { firstName: 'Jussi', lastName: 'Virtanen', dateOfBirth: '1987-08-19', currencyId: 'EUR', accountClosed: false, accountSuspended: false, balance: 4_25 },
  { firstName: 'Anna', lastName: 'Koskinen', dateOfBirth: '1990-11-22', currencyId: 'EUR', accountClosed: false, accountSuspended: false, balance: 2_75 },
  { firstName: 'Liisa', lastName: 'Mäki', dateOfBirth: '1983-12-19', currencyId: 'EUR', accountClosed: true, accountSuspended: true, balance: 3_50 },
  // Accounts with more than 5 EUR
  { firstName: 'Sami', lastName: 'Laine', dateOfBirth: '1991-03-21', currencyId: 'EUR', accountClosed: false, accountSuspended: false, balance: 6_75 },
  { firstName: 'Elina', lastName: 'Korhonen', dateOfBirth: '1985-07-17', currencyId: 'EUR', accountClosed: true, accountSuspended: true, balance: 9_50 },

  // Malteses (EUR)
  { firstName: 'Lara', lastName: 'Camilleri', dateOfBirth: '1988-07-07', currencyId: 'EUR', accountClosed: false, accountSuspended: false, balance: 1_50 },
  { firstName: 'Peter', lastName: 'Borg', dateOfBirth: '1987-06-15', currencyId: 'EUR', accountClosed: false, accountSuspended: false, balance: 2_25 },
  { firstName: 'Tony', lastName: 'Cassar', dateOfBirth: '1995-03-03', currencyId: 'EUR', accountClosed: true, accountSuspended: true, balance: 3_75 },
  // Accounts with more than 5 EUR
  { firstName: 'Emma', lastName: 'Fenech', dateOfBirth: '1993-09-28', currencyId: 'EUR', accountClosed: false, accountSuspended: false, balance: 7_25 },
  { firstName: 'Jake', lastName: 'Galea', dateOfBirth: '1986-02-14', currencyId: 'EUR', accountClosed: true, accountSuspended: true, balance: 8_00 },
];

describe.skip('IDXD-1205 Automated Job for Zeroing Small Remaining Balances in Closed Player Accounts', () => {
  beforeEach(async () => {
    try {
      logger.info(`Cleaning up players database, and loading ${fakePlayers.length} fake players...`, fakePlayers);
      await clean.players();
      for (const [index, player] of fakePlayers.entries()) {
        const { firstName, lastName, balance } = player;
        logger.info(`[${index}] Creating player ${firstName} ${lastName}...`, player);
        const createdPlayer = await createPlayer(testPlayer({ brandId: sample(['LD', 'CJ']), ...player }));
        await pg('players').update({ balance, gamblingProblem: true }).where({ id: createdPlayer.id });
      }
      const players = await pg('players');
      logger.debug('Players:', players);
      expect(players).to.have.length(fakePlayers.length);
      const suspendedAndClosedPlayers = players.filter((player) => player.accountSuspended && player.accountClosed);
      expect(suspendedAndClosedPlayers).to.have.length(8);
    } catch (error) {
      logger.error(error);
    }
  });

  it('Loads data for the script to run', async () => {
    const players = await pg('players');
    expect(players).to.have.length(fakePlayers.length);
  });
});
