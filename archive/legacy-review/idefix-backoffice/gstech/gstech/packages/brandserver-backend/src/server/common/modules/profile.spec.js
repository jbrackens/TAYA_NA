/* @flow */

describe('Profile API', () => {
  let session;
  before(async () => {
    session = await setup.player();
  });

  it('fetches player profile', async () =>
    session
      .get('/api/profile')
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          profile: { }
        })
      })
  );
});
