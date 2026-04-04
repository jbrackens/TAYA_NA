// @flow
const pg = require('gstech-core/modules/pg');

const { renderSms } = require('./smsRenderer');
const { cleanDb } = require('../../utils');

describe('smsRenderer', () => {
  let contentId;

  before(async () => {
    await cleanDb();
    const [contentType] = await pg('content_type')
      .insert({ type: 'email', brandId: 'KK' })
      .returning('id');
    expect(contentType.id).to.exist();
    const contentTypeId = contentType.id;
    const [content] = await pg('content')
      .insert({
        contentTypeId,
        name: 'KK_Something',
        externalId: '111',
        content: JSON.stringify({
          type: 'transactional',
          fi: {
            text: 'Hei {name}! Väiski viskaisi pelitilillesi 300€ bonusrahaa 10x kierrätyksellä. KalevalaKasino.com',
          },
          en: {
            text: 'Hei {name}! Väiski viskaisi pelitilillesi 300€ bonusrahaa 10x kierrätyksellä. KalevalaKasino.com',
          },
        }),
      })
      .returning('id')
    expect(content.id).to.exist();
    contentId = content.id;
  });

  it('Renders properly sms in 1 language if provided', async () => {
    const renderedSms = await renderSms(contentId, {
      firstName: 'Adam',
      languageId: 'fi',
      currencyId: 'EUR',
    });

    expect(renderedSms).to.deep.equal({
      brandId: 'KK',
      content: {
        fi:
          'Hei Adam! Väiski viskaisi pelitilillesi 300€ bonusrahaa 10x kierrätyksellä. KalevalaKasino.com',
      },
    });
  });

  it('Renders properly sms in all avialble languages if no language provided', async () => {
    const renderedSms = await renderSms(contentId, {
      firstName: 'Adam',
      currencyId: 'EUR',
    });

    expect(renderedSms).to.deep.equal({
      brandId: 'KK',
      content: {
        fi:
          'Hei Adam! Väiski viskaisi pelitilillesi 300€ bonusrahaa 10x kierrätyksellä. KalevalaKasino.com',
        en:
          'Hei Adam! Väiski viskaisi pelitilillesi 300€ bonusrahaa 10x kierrätyksellä. KalevalaKasino.com',
      },
    });
  });
});
