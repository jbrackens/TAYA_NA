/* @flow */
const { lookup } = require('./index');

describe('GeoIP lookup', () => {
  it('looks up country code for IPv4 address', async () => {
    const country = await lookup('8.8.4.4');
    expect(country).to.equal('US');
  });

  it('looks up country code for IPv6 address', async () => {
    const country = await lookup('2001:4860:4860::8888');
    expect(country).to.equal('US');
  });
});
