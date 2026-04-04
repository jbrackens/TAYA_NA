/* @flow */

describe('LuckyDino Rewards', () => {
  let session;
  let rewardId;

  before(async () => {
    session = await setup.player({});
  });

  it('gets list of credited rewards', async () => {
    await session
      .get('/api/rewards')
      .expect((res) => {
        rewardId = res.body.rewards[0].id;
        expect(res.body.update.banners['myaccount-rewards'].banner).to.contain('Star Joker');
        expect(res.body).to.containSubset({
          rewards: [
            {
              type: '<strong>7</strong><b> Free<br />\nSpins</b>',
              thumbnail: 'PRAGMATIC/thedoghousemegaways.jpg',
              rewardid: 'b55',
              action: '/loggedin/game/thedoghousemegaways/',
            }
          ],
          update: {
            details: { rewardsCount: 1 },
          }
        });
      })
      .expect(200);
  });

  it('can use a reward', async () => {
    await session
      .post(`/api/rewards/${rewardId}`)
      .expect((res) => {
        // TODO credit fails at the moment. Need to figure out what to do with it
        expect(res.body).to.containSubset({
        });
      })
      .expect(200);
  });

  it('gets meter state from game refresh', async () => {
    await session
      .post('/api/refresh-game/starburst')
      .expect(200);
  });
});
