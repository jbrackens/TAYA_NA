/* @flow */

const pg = require('gstech-core/modules/pg');

const { cleanDb } = require('../../utils');
const { renderNotification } = require('./notificationRenderer');

describe('notificationRenderer', () => {
  let contentId;

  before(async () => {
    await cleanDb();
    const [cT1] = await pg('content_type')
      .insert({ type: 'notification', brandId: 'CJ' })
      .returning('id');
    expect(cT1.id).to.exist();
    const contentTypeId = cT1.id;
    const [c1] = await pg('content').insert(
      {
        contentTypeId,
        name: 'CJ_Notification',
        externalId: '2222',
        content: JSON.stringify({
          action: '',
          image: '',
          en: {
            content: 'Today. *This is a personal offer*',
          },
          fi: {
            content: 'Peliin. *Tämä on henkilökohtainen tarjous*',
          },
        }),
      })
      .returning('id')
    expect(c1.id).to.exist();
    contentId = c1.id;
  });

  it('renders properly notification in Finnish', async () => {
    const render = await renderNotification(contentId, {
      firstName: 'Patryk',
      currencyId: 'EUR',
      languageId: 'fi',
    });

    expect(render).to.include('html');
    expect(render).to.include('<p>Peliin. <em>Tämä on henkilökohtainen tarjous</em>');
    expect(render).to.not.include('<img');
  });

  it('renders properly notification in English', async () => {
    const render = await renderNotification(contentId, {
      firstName: 'Patryk',
      currencyId: 'EUR',
      languageId: 'en',
    });

    expect(render).to.include('<p>Today. <em>This is a personal offer</em>');
  });
});
