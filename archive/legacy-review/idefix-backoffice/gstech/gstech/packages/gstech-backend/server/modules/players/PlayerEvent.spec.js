/* @flow */
const { players: { john } } = require('../../../scripts/utils/db-data');
const Player = require('./Player');
const PlayerEvent = require('./PlayerEvent');

describe('PlayerEvents', () => {
  describe('when new player is created', () => {
    let playerId;

    before(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
    });

    it('has initial values for promotion settings and tc', async () => {
      const events = await PlayerEvent.queryPlayerEvents(playerId);
      expect(events.length).to.equal(3);
      expect(events).to.containSubset([
        {
          key: 'players.allowEmailPromotions',
          title: 'E-mail promotions enabled with consent from player',
        },
        {
          key: 'players.allowSMSPromotions',
          title: 'SMS promotions enabled with consent from player',
        },
        {
          key: 'players.tcVersion',
          title: 'Player accepted Terms & Conditions version 4',
        },
      ]);
    });

    it('can log an login event for player', () =>
      PlayerEvent.addEvent(playerId, null, 'activity', 'login', { IPAddress: '1.2.3.4' }));

    it('can log a note event for player', () =>
      PlayerEvent.addNote(playerId, 1, 'Disabled game play until KYC documents are received'));

    it('can log a sticky note event for player', async () => {
      const [note] = await PlayerEvent.addNote(playerId, 1, 'Disabled game play until KYC documents are received (sticky)').returning('*');
      await Player.setStickyNote(playerId, note.id);
    });

    it('can get note events for player', async () => {
      const notes = await PlayerEvent.queryPlayerEvents(Number(playerId), ['note']);
      expect(notes).to.deep.equal([{
        id: notes[0].id,
        type: 'note',
        key: null,
        content: 'Disabled game play until KYC documents are received (sticky)',
        title: null,
        fraudId: null,
        details: null,
        createdAt: notes[0].createdAt,
        handle: 'Test',
        userId: 1,
        isSticky: true,
      }, {
        id: notes[1].id,
        type: 'note',
        key: null,
        content: 'Disabled game play until KYC documents are received',
        title: null,
        details: null,
        fraudId: null,
        createdAt: notes[1].createdAt,
        handle: 'Test',
        userId: 1,
        isSticky: false,
      }]);
    });

    it('returns current events', async () => {
      const events = await PlayerEvent.queryPlayerEvents(playerId);
      expect(events.length).to.equal(6);
      expect(events).to.containSubset([
        {
          type: 'note',
          content: 'Disabled game play until KYC documents are received',
          handle: 'Test',
        },
        {
          type: 'activity',
          title: 'Successful login from 1.2.3.4',
          details: {
            IPAddress: '1.2.3.4',
          },
        },
      ]);
    });
  });
});
