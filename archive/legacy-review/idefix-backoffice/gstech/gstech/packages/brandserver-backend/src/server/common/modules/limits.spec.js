/* @flow */
describe('German player limits', () => {
  let session;

  before(async () => {
    session = await setup.player({ countryISO: 'DE' });
  });

  it('requires limit to be set', async () => {
    await session
      .get('/api/init')
      .expect((res) => {
        expect(res.body).to.containSubset({
          requiredQuestionnaires: ['GNRS_limits']
        });
      })
      .expect(200);
  });
});
