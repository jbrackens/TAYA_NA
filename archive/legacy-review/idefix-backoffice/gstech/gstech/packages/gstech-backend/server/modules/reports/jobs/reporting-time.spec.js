/* @flow */
const moment = require('moment-timezone');
const {
  hourEnd,
  hourStart,
} = require('./reporting-time');


describe('Reporting time helpers', () => {
  it('formats correct hour begin and end times', async () => {
    expect(hourStart(moment('2020-10-25T02:00:00.000000+02:00'))).to.equal('2020-10-25T02:00:00.000000+02:00');
    expect(hourEnd(moment('2020-10-25T02:00:00.000000+02:00'))).to.equal('2020-10-25T02:59:59.999999+02:00');
  });

  it('gives correct timespan at the end of DST', async () => {
    expect(hourStart(moment('2020-10-25T03:00:00.000000+01:00'))).to.equal('2020-10-25T02:00:00.000000+01:00');
    expect(hourEnd(moment('2020-10-25T03:00:00.000000+01:00'))).to.equal('2020-10-25T03:59:59.999999+01:00');
  });
});
