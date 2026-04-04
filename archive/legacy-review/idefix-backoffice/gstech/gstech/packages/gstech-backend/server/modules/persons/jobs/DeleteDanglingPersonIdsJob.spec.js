/* @flow */
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const {
  players: { john, jack },
} = require('../../../../scripts/utils/db-data');
const Player = require('../../players/Player');

const DeleteDanglingPersonIdsJob = require('./DeleteDanglingPersonIdsJob');

describe('Executes DeleteDanglingPersonIdsJob', () => {
  let playersBeforeJob;
  let personsBeforeJob;
  let player1;
  let player2;
  let player3;
  let personId;
  let danglingPersonId;

  beforeEach(async () => {
    await clean.players();
    await pg('persons').del();
    player1 = await Player.create({ brandId: 'LD', ...john });
    player2 = await Player.create({ brandId: 'CJ', ...john });
    player3 = await Player.create({ brandId: 'LD', ...jack });
    [{ id: personId }] = await pg.insert({}).into('persons').returning('id');
    await pg('players').where({ id: player1.id }).update({ personId });
    await pg('players').where({ id: player2.id }).update({ personId });
    [{ id: danglingPersonId }] = await pg.insert({}).into('persons').returning('id');
    await pg('players').where({ id: player3.id }).update({ personId: danglingPersonId });
  });

  it('deletes person that have only one player', async () => {
    playersBeforeJob = await pg('players').select();
    expect(playersBeforeJob).to.have.length(3);
    personsBeforeJob = await pg('persons').select();
    expect(personsBeforeJob).to.have.length(2);

    await DeleteDanglingPersonIdsJob.run();

    const playersAfterJob = await pg('players').select();
    expect(playersAfterJob).to.have.length(3);
    const personsAfterJob = await pg('persons').select();
    expect(personsAfterJob).to.have.length(1);
    expect(personsAfterJob[0].id).to.equal(personId);

    logger.debug({ playersBeforeJob, personsBeforeJob, playersAfterJob, personsAfterJob });
  });

  it('deletes person that have no players', async () => {
    const [{ id: danglingPersonId2 }] = await pg.insert({}).into('persons').returning('id'); // eslint-disable-line no-unused-vars
    const [{ id: danglingPersonId3 }] = await pg.insert({}).into('persons').returning('id'); // eslint-disable-line no-unused-vars
    const [{ id: danglingPersonId4 }] = await pg.insert({}).into('persons').returning('id'); // eslint-disable-line no-unused-vars
    playersBeforeJob = await pg('players').select();
    expect(playersBeforeJob).to.have.length(3);
    personsBeforeJob = await pg('persons').select();
    expect(personsBeforeJob).to.have.length(5);

    await DeleteDanglingPersonIdsJob.run();

    const playersAfterJob = await pg('players').select();
    expect(playersAfterJob).to.have.length(3);
    const personsAfterJob = await pg('persons').select();
    expect(personsAfterJob).to.have.length(1);
    expect(personsAfterJob[0].id).to.equal(personId);

    logger.debug({ playersBeforeJob, personsBeforeJob, playersAfterJob, personsAfterJob });
  });
});
