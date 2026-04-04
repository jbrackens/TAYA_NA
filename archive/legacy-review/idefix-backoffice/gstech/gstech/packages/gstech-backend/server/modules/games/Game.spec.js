/* @flow */
const { players: { john } } = require('../../../scripts/utils/db-data');
const Player = require('../players/Player');
const Game = require('./Game');
const { createSession } = require('../sessions');
const nock = require('nock'); // eslint-disable-line

// nock.recorder.rec();

const gameLaunchOptions = {
  bankingUrl: '',
  gameUrl: '',
  lobbyUrl: '',
  mobile: true,
  forceIframe: false,
  options: {},
};

nock('http://localhost:3004')
  .post('/api/v1/LD/game/NE', body => body.game.manufacturerGameId === 'junglespirit_not_mobile_sw' && body.sessions.length === 0)
  .reply(200, {
    game: {
      html: 'game launch html',
    },
    session: {
      sessionId: '1495182548954-36938-DVJL7A68GMBWY',
      type: 'desktop',
      parameters: { foo: 1 },
    },
  });

nock('http://localhost:3004')
  .post('/api/v1/LD/game/NE', body => body.game.manufacturerGameId === 'junglespirit_not_mobile_sw' && body.sessions.length === 1 && body.sessions[0].parameters.foo === 1 && body.sessions[0].sessionId === '1495182548954-36938-DVJL7A68GMBWY')
  .reply(200, {
    game: {
      html: 'game launch html',
    },
  });

nock('http://localhost:3004')
  .post('/api/v1/LD/game/NE', body => body.game.manufacturerGameId === 'wildwildwest_not_mobile_sw' && body.sessions.length === 0)
  .reply(200, {
    game: {
      html: 'game launch html',
    },
    session: {
      sessionId: '1495182548954-36938-DVJL7A68GMBBB',
      type: 'desktop',
      parameters: { foo: 2 },
      manufacturerId: 'NES',
    },
  });

nock('http://localhost:3004')
  .post('/api/v1/LD/game/NE', body => body.game.manufacturerGameId === 'wildwildwest_not_mobile_sw' && body.sessions.length === 1 && body.sessions[0].parameters.foo === 2 && body.sessions[0].sessionId === '1495182548954-36938-DVJL7A68GMBBB' && body.sessions[0].manufacturerId === 'NES')
  .reply(200, {
    game: {
      html: 'game launch html',
    },
  });

nock('http://localhost:3004')
  .post('/api/v1/LD/game/NE/demo', body => body.languageId === 'en' && body.currencyId === 'EUR' && body.game.manufacturerGameId === 'junglespirit_not_mobile_sw')
  .reply(200, {
    game: {
      html: 'game launch html',
    },
  });

describe('Game', () => {
  describe('When player is logged in', () => {
    let playerId;
    let sessionId;
    before(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      const session = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
      sessionId = session.id;
    });

    it('can launch a game without session', async () => {
      const result = await Game.launchGame(playerId, 1, sessionId, false, gameLaunchOptions);
      expect(result).to.containSubset({
        html: 'game launch html',
      });
    });

    it('can launch game again with a session', async () => {
      const result = await Game.launchGame(playerId, 1, sessionId, false, gameLaunchOptions);
      expect(result).to.containSubset({
        html: 'game launch html',
      });
    });
  });

  describe('When player is logged in with player using alternative game provider variation', () => {
    let playerId;
    let sessionId;
    before(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      const session = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
      sessionId = session.id;
    });

    it('can launch game using different manufacturer variant', async () => {
      const result = await Game.launchGame(playerId, 2, sessionId, false, gameLaunchOptions);
      expect(result).to.containSubset({
        html: 'game launch html',
      });
    });

    it('can relaunch game using different manufacturer variant and still access the old session', async () => {
      const result = await Game.launchGame(playerId, 2, sessionId, false, gameLaunchOptions);
      expect(result).to.containSubset({
        html: 'game launch html',
      });
    });
  });

  describe('When player is not logged in', () => {
    it('can launch a demo game', async () => {
      const result = await Game.launchDemoGame('LD', 1, 'en', 'EUR', gameLaunchOptions, {
        ipAddress: '10.110.11.11',
        userAgent: 'Browser',
        isMobile: false,
      });
      expect(result).to.containSubset({
        html: 'game launch html',
      });
    });
  });
});
