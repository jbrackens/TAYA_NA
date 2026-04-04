/* @flow */
describe('Withdraw api', () => {
  let session;

  before(async () => {
    session = await setup.player();
  });

  it('can fetch withdrawal initial state', async () => {
    await session
      .get('/api/withdraw')
      .expect((res) => {
        expect(res.body).to.containSubset({
          accessStatus: {
            KycRequired: false,
          },
          withdrawalFee: false,
          withdrawalAllowed: true,
        });
      })
      .expect(200);
  });
});