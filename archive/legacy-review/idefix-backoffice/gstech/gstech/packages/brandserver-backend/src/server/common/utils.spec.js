/* eslint-disable */

const assert = require('assert');
const { money, populate, md5, getRemoteAddress, populatePath, localizeDefaults } = require('./utils');

describe('money amount can be formatted to a string', () => {
  it('should be able to correctly format finnish euro amounts', () => assert.equal(money({ code: 'fi' })(10000.3, 'EUR'), '10 000,30 €'));

  it('is able to correctly format swedish krona amounts', () => assert.equal(money({ code: 'sv' })(10000.3, 'SEK'), '10 000,30 kr'));

  return it('is able to correctly format negative amounts', () => assert.equal(money({ code: 'en' })(-10000.3, 'EUR'), '-€10,000.30'));
});

describe('MD5', () => it('can create hash', () => assert.equal('de513aed54785ba15b4fee38368137bd', md5('123123123123sdanidasndajnkdasknjdasnjkjnk%123123123'))));

describe('Primitive markup can be populated', () => {
  it('returns HTML', () => {
    const expected = '"Hey Foobar!<br />\n<br />\nTo complete { width: 123 } your registration just click on the button or the link below, and you can start getting lucky at LuckyDino! <br />\n<br />\n<a href="http://www.google.com/" class="link">Verify account</a><br />\n<br />\nSee you there!<br />\n<br />\nYours,<br />\nLuckyDino"';
    assert.equal(expected, populate('"Hey {name}!\n\nTo complete { width: 123 } your registration just click on the button or the link below, and you can start getting lucky at LuckyDino! \n\n{link|Verify account}\n\nSee you there!\n\nYours,\nLuckyDino"', { name: 'Foobar', link: 'http://www.google.com/' }, true));
  });

  it('returns plain text', () => {
    const expected = '"Hey Foobar!\n\nTo complete your registration just click on the button or the link below, and you can start getting lucky at LuckyDino! \n\nVerify account: http://www.google.com/\n\nSee you there!\n\nYours,\nLuckyDino"';
    assert.equal(expected, populate('"Hey {name}!\n\nTo complete your registration just click on the button or the link below, and you can start getting lucky at LuckyDino! \n\n{link|Verify account}\n\nSee you there!\n\nYours,\nLuckyDino"', { name: 'Foobar', link: 'http://www.google.com/' }, false));
  });

  it('returns data populated from lookup table', () => {
    const expected = '"Hey 100€"';
    assert.equal(expected, populate('"Hey {currency:c100}"', { currency: { c100: '100€', c200: '200€' } }));
  });

  it('returns converted data', () => {
    const expected = 'Hey 5 000 kr';
    assert.equal(expected, populate('Hey {currency:500}', localizeDefaults({ currencyISO: 'SEK', languageISO: 'sv' })));
  });
});

describe('Remote address of user', () => {
  it('can handle proxies', () => assert.equal('108.168.169.40', getRemoteAddress({ headers: { 'x-forwarded-for': '85.76.38.180, 108.168.169.40' }, connection: { remoteAddress: '10.1.2.3' } })));
});

describe('Populates path variables', () => it('can do it', () => assert.equal('/foo/bar/zoo', populatePath('/foo/:p_1/:p_2', { p_1: 'bar', p_2: 'zoo' }))));
