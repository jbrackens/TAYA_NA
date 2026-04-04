/* @flow */
const ActiveUsersReport = require('./ActiveUsersReport');

describe('Active users report', () => {
  it('generates report', async () => {
    const report = await ActiveUsersReport.report();
    expect(report.length).to.equal(5);
  });
});
