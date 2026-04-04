/* @flow */
const request = require('supertest');  
const app = require('../../api-server');
const config = require('../../../config');

const nock = require('nock'); // eslint-disable-line
// nock.recorder.rec();

describe('Red Tiger API', () => {
  let player;
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'RTG',
        initialBalance: 1000,
      })
      .expect((res) => {
        player = res.body.player;
      })
      .expect(200);

    nock('https://gserver-luckydino-dev.dopamine-gaming.com:443', { encodedQueryParams: true })
      .post('/luckydino/api/bonuses/offer', {
        campaignId: 1,
        userId: `${player.brandId}_${player.id}`,
        currency: 'EUR',
        instanceCode: 'abcd1234',
        casino: 'LD_',
      })
      .reply(200, {
        success: true,
        result: {
          id: 1,
          code: 'abcd1234',
          campaignId: 1,
          campaignCode: 'promotest',
          verticals: ['Default'],
          type: 'spins',
          subtype: 'finite',
          currency: 'EUR',
          games: ['DragonsLuck'],
          state: 'pending',
          periods: {
            pending: 604800,
            preactive: 604800,
            active: 604800,
            postactive: 0,
          },
        },
      });
  });

  nock('https://feed-luckydino.redtiger.cash:443', { encodedQueryParams: true })
    .get('/jackpots')
    .query({ currency: 'EUR' })
    .reply(200, {
      success: true,
      result: {
        jackpots: [{
          brands: ['CJ_', 'KK_', 'LD_', 'NONE', 'OS_'],
          jackpotId: 'network',
          name: 'network',
          games: ['TreasureMine', 'TikiFruits', 'MysteryFruit', 'MayanGods', 'FlamingFox'],
          pots: [{
            id: 44001,
            key: '44001',
            name: 'Daily',
            type: 'time',
            state: 'active',
            amount: '1028.83',
            prevWinAmount: '1028.11',
            seedAmount: '1028.10',
            seedNextAmount: '1028.10',
            prevWinTime: '2019-04-16 06:40:02',
            targetAmount: null,
            hotAmount: null,
            time: {
              current: '2019-04-16 10:49:16',
              periods: '2019-04-16 18:00:00',
              target: '2019-04-16 21:00:00',
              started: '2019-04-15 13:29:34',
              ended: null,
              won: '2019-04-16 06:40:02',
              hidden: '2019-04-16 06:40:02',
            },
            currency: 'EUR',
            currencySymbol: '€',
          }, {
            id: 44002,
            key: '44002',
            name: 'Progressive',
            type: 'progressive',
            state: 'active',
            amount: '297008.03',
            prevWinAmount: '0.00',
            seedAmount: '297007.40',
            seedNextAmount: '297007.40',
            prevWinTime: null,
            targetAmount: null,
            hotAmount: null,
            time: {
              current: '2019-04-16 10:49:16',
              periods: null,
              target: null,
              started: '2019-04-15 11:15:14',
              ended: null,
              won: null,
              hidden: null,
            },
            currency: 'EUR',
            currencySymbol: '€',
          }],
        }],
      },
    });

  nock('https://feed-luckydino.redtiger.cash:443', { encodedQueryParams: true })
    .get('/jackpots')
    .times(2)
    .query({ currency: 'SEK' })
    .reply(200, {
      success: true,
      result: {
        jackpots: [{
          brands: ['CJ_', 'KK_', 'LD_', 'NONE', 'OS_'],
          jackpotId: 'network',
          name: 'network',
          games: ['TreasureMine', 'TikiFruits', 'MysteryFruit', 'MayanGods', 'FlamingFox'],
          pots: [{
            id: 44001,
            key: '44001',
            name: 'Daily',
            type: 'time',
            state: 'active',
            amount: '10667.32',
            prevWinAmount: '10659.81',
            seedAmount: '10659.73',
            seedNextAmount: '10659.73',
            prevWinTime: '2019-04-16 06:40:02',
            targetAmount: null,
            hotAmount: null,
            time: {
              current: '2019-04-16 10:49:16',
              periods: '2019-04-16 18:00:00',
              target: '2019-04-16 21:00:00',
              started: '2019-04-15 13:29:34',
              ended: null,
              won: '2019-04-16 06:40:02',
              hidden: '2019-04-16 06:40:02',
            },
            currency: 'SEK',
            currencySymbol: 'kr',
          }, {
            id: 44002,
            key: '44002',
            name: 'Progressive',
            type: 'progressive',
            state: 'active',
            amount: '3079485.22',
            prevWinAmount: '0.00',
            seedAmount: '3079478.67',
            seedNextAmount: '3079478.67',
            prevWinTime: null,
            targetAmount: null,
            hotAmount: null,
            time: {
              current: '2019-04-16 10:49:16',
              periods: null,
              target: null,
              started: '2019-04-15 11:15:14',
              ended: null,
              won: null,
              hidden: null,
            },
            currency: 'SEK',
            currencySymbol: 'kr',
          }],
        }],
      },
    });

  nock('https://feed-luckydino.redtiger.cash:443', { encodedQueryParams: true })
    .get('/jackpots')
    .query({ currency: 'EUR2' })
    .reply(200, {
      success: false,
      error: {
        msg: 'Invalid currency provided. EUR2',
        details: {
          info: null,
        },
        code: 4,
        debug: {
          file: '/platform/src/jackpots/JackpotService.php:383',
          trace: ['#0 /platform/src/RgsClientService.php(898): rgs\\jackpots\\JackpotService->getFeed(..)', '#1 /platform/src/Rgs.php(505): rgs\\RgsClientService->getJackpotFeed(..)', '#2 /platform/lib/dopamine/app/Application.php(179): rgs\\Rgs->feed(..))', '#3 /platform/src/Rgs.php(396): rgs\\lib\\dopamine\\app\\Application->execRequest(..))', '#4 /platform/src/Rgs.php(420): rgs\\Rgs->execRequest(..))', '#5 /platform/public/index.prod.php(6): rgs\\Rgs->execHttp()', '#6 /platform/public/index.php(12): require_once(..)', '#7 {main}'],  
        },
      },
    });

  it('can get jackpots', () =>
    request(app)
      .post('/api/v1/LD/getjackpots/RTG')
      .send({
        games: [{ manufacturerGameId: 'DragonsLuck', gameId: 'RTG_DragonsLuck' }, { manufacturerGameId: 'TreasureMine', gameId: 'RTG_TreasureMine' }],
        currencies: ['EUR', 'SEK'],
      })
      .expect((res) => {
        expect(res.body).to.containSubset([{
          game: 'RTG_TreasureMine',
          currencies: [
            {
              amount: '297008.03',
              currency: 'EUR',
            }, {
              amount: '3079485.22',
              currency: 'SEK',
            },
          ],
        }]);
      })
      .expect(200));

  it('can get jackpots with wrong currency', () =>
    request(app)
      .post('/api/v1/LD/getjackpots/RTG')
      .send({
        games: [{ manufacturerGameId: 'FlamingFox', gameId: 'RTG_FlamingFox' }, { manufacturerGameId: 'TreasureMine', gameId: 'RTG_TreasureMine' }],
        currencies: ['EUR2', 'SEK'],
      })
      .expect((res) => {
        expect(res.body).to.containSubset([{
          game: 'RTG_TreasureMine',
          currencies: [{
            amount: '3079485.22',
            currency: 'SEK',
          },
          ],
        }, {
          game: 'RTG_FlamingFox',
          currencies: [{
            amount: '3079485.22',
            currency: 'SEK',
          },
          ],
        }]);
      })
      .expect(200));

  // TODO: red tiger free spins do not work as we expect. They credit those to all the players in a one shot. Disabling those to avoid any accidental credit
  // it('can credit free spins', () =>
  //   request(app)
  //     .post('/api/v1/LD/creditfreespins/RTG')
  //     .send({
  //       player,
  //       bonusCode: '1',
  //       id: 'abcd1234',
  //     })
  //     .expect((res) => {
  //       expect(res.body).to.containSubset({
  //         ok: true,
  //       });
  //     })
  //     .expect(200));
});
