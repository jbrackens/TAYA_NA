/* @flow */

describe('Jefe Wheel', () => {
  let session;

  before(async () => {
    session = await setup.player({});
  });

  it('gets wheel state', async () => {
    await session
      .get('/api/wheel')
      .expect((res) => {
        expect(res.body).to.containSubset({
          update: {
            details: {
              VIPLevel: 1,
              // bountiesCount: 1, // FIXME: not in campa mock data at the moment, disabling
              spinCount: 0,
            },
          }
        });
      })
      .expect(200);
  });
});
