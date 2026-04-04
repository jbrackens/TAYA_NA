/* @flow */

describe('Jefe Bounties', () => {
  let session;
  // let bountyId;

  before(async () => {
    session = await setup.player({});
  });

  it('gets list of credited bounties', async () => {
    await session
      .get('/api/bounties')
      .expect((res) => {
        expect(res.body).to.containSubset({
          /*
          bounties: [
            {
              type: 'freespins',
              bounty_image: '11_reactoonz',
              action: '/loggedin/game/reactoonz/'
            }
          ],
          */
          update: {
            details: {
              // bountiesCount: 1,
              spinCount: 0,
            },
          }
        });
        // bountyId = res.body.bounties[0].id;
      })
      .expect(200);
  });
  /*
  it('can use a bounties', async () => {
    await session
      .post(`/api/bounties/${bountyId}`)
      .expect((res) => {
        // TODO credit fails at the moment. Need to figure out what to do with it
        expect(res.body).to.containSubset({
        });
      })
      .expect(200);
  });
  */
  it('gets meter state from game refresh', async () => {
    await session
      .post('/api/refresh-game/starburst')
      .expect(200);
  });
});
