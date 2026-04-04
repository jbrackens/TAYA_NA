/* @flow */
const pg = require('gstech-core/modules/pg');

const {
  players: { john, jack, testPlayer },
} = require('../../../scripts/utils/db-data');
const {
  connectPlayersWithPerson,
  disconnectPlayerFromPerson,
  getConnectedPlayers,
  connectPlayersWithSamePhoneAndEmail,
} = require('./Person');
const Player = require('../players/Player');

describe('Person repository', () => {
  let playerId;
  let otherPlayerId;
  let playerPersonId;
  let thirdPlayerId;

  before(async () => {
    await clean.players();
    const player = await Player.create({ brandId: 'LD', ...john });
    playerId = player.id;
    const otherPlayer = await Player.create({ brandId: 'LD', ...jack });
    otherPlayerId = otherPlayer.id;
    const thirdPlayer = await Player.create(testPlayer({ brandId: 'LD' }));
    thirdPlayerId = thirdPlayer.id;
  });

  describe('connectPlayersWithPerson', () => {
    it('should connect players to the same person', async () => {
      await connectPlayersWithPerson(pg, otherPlayerId, playerId);

      const players = await pg('players')
        .whereIn('id', [playerId, otherPlayerId])
        .select('personId');
      expect(players[0].personId).to.equal(players[1].personId);
      playerPersonId = players[0].personId;
    });

    it('should throw error if trying to connect already connected player', async () => {
      const [p] = await pg('persons').insert({}).returning('id');
      expect(p.id).to.be.a('number');
      await pg('players').where({ id: otherPlayerId }).update({ personId: p.id });

      try {
        await connectPlayersWithPerson(pg, playerId, otherPlayerId);
        expect(true).to.equal(false);
      } catch (e) {
        expect(e.message).to.equal(`DIFFERENT PERSONS EXIST: ${playerId}, ${otherPlayerId}`);
      }
    });

    it('should return connected players', async () => {
      await pg('players').where({ id: otherPlayerId }).update({ personId: playerPersonId });

      const players = await getConnectedPlayers(pg, playerId);

      expect(players).to.have.deep.members([
        {
          id: otherPlayerId,
          firstName: jack.firstName,
          lastName: jack.lastName,
          email: jack.email,
          brandId: 'LD',
          currencyId: 'EUR',
          riskProfile: 'low',
        },
      ]);
    });

    it('should connect more players to the same person', async () => {
      await connectPlayersWithPerson(pg, thirdPlayerId, playerId);

      const players = await pg('players')
        .whereIn('id', [playerId, otherPlayerId])
        .select('personId');
      expect(players[0].personId).to.equal(players[1].personId);
      const p = await pg('players')
        .where({ personId: players[0].personId });
      expect(p.length).to.equal(3);
    });

    it('should disconnect player from person', async () => {
      await disconnectPlayerFromPerson(pg, playerId);

      const players = await pg('players')
        .whereIn('id', [playerId])
        .select('personId');

      expect(players[0].personId).to.equal(null);
    });
  });

  describe('connectPlayersWithSamePhoneAndEmail', () => {
    const sameEmail = 'same-email@somecompany.com';
    const samePhone = '123456789';
    const languageId = 'fi';
    const countryId = 'FI';
    const sharedDetails = { email: sameEmail, mobilePhone: samePhone, languageId, countryId };

    before(async () => {
      await clean.players();
      await pg('persons').del();
      const player = await Player.create({ brandId: 'CJ', ...john, ...sharedDetails });
      playerId = player.id;
      await Player.create({ brandId: 'FK', ...jack, ...sharedDetails });
      await Player.create(testPlayer({ brandId: 'KK', ...sharedDetails }));
    });

    it('should connect all players with same email and phone', async () => {
      await connectPlayersWithSamePhoneAndEmail(playerId);
      const player = await pg('players').first().where({ id: playerId });
      const { email, mobilePhone } = player;
      const allPlayersWithSamePhoneAndEmail = await pg('players').where({ email, mobilePhone });
      expect(allPlayersWithSamePhoneAndEmail.length).to.equal(3);
      allPlayersWithSamePhoneAndEmail.every((playerItem) => expect(playerItem.personId).to.exist());
      const firstPlayer = allPlayersWithSamePhoneAndEmail[0];
      allPlayersWithSamePhoneAndEmail.every((playerItem) =>
        expect(playerItem.personId).to.equal(firstPlayer.personId),
      );
    });

    it('should connect with all other already connected players with same email and phone', async () => {
      await connectPlayersWithSamePhoneAndEmail(playerId);
      const fourthPlayer = await Player.create(testPlayer({ brandId: 'LD', ...sharedDetails }));
      await connectPlayersWithSamePhoneAndEmail(fourthPlayer.id);
      const { email, mobilePhone } = fourthPlayer;
      const playersSamePhoneEmail = await pg('players').where({ email, mobilePhone });
      expect(playersSamePhoneEmail.length).to.equal(4);
      playersSamePhoneEmail.every((p) => expect(p.personId).to.exist());
      const firstPlayer = playersSamePhoneEmail[0];
      playersSamePhoneEmail.every((p) => expect(p.personId).to.equal(firstPlayer.personId));
    });
  });
});
