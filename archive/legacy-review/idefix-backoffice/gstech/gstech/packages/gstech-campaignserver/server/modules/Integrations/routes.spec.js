/* @flow */

const request = require('supertest');

const pg = require('gstech-core/modules/pg');

const app = require('../../app-private');
const { cleanDb } = require('../../utils');
const { contentType } = require('../../mockData');

const publishRequestBody = {
  sys: {
    type: 'Entry',
    id: '5oTa3K1zLy1rDRioBOxTb4',
    contentType: {
      sys: {
        type: 'Link',
        linkType: 'ContentType',
        id: 'mailer',
      },
    },
    revision: 1,
    createdAt: '2020-10-06T14:16:01.499Z',
    updatedAt: '2020-10-06T14:16:01.499Z',
  },
  fields: {
    id: {
      fi: '123123',
    },
    subject: {
      en: '1',
      fi: '123123',
    },
    text: {
      fi: '3123',
    },
    image: {
      fi: '123123',
    },
    type: {
      fi: 'campaign',
    },
  },
};

const deleteRequestBody = {
  sys: {
    type: 'DeletedEntry',
    id: '5oTa3K1zLy1rDRioBOxTb4',
    space: { sys: { type: 'Link', linkType: 'Space', id: 'r4zhhatpe62n' } },
    environment: { sys: { id: 'master', type: 'Link', linkType: 'Environment' } },
    contentType: { sys: { type: 'Link', linkType: 'ContentType', id: 'mailer' } },
    revision: 1,
    createdAt: '2020-10-06T14:16:46.651Z',
    updatedAt: '2020-10-06T14:16:46.651Z',
    deletedAt: '2020-10-06T14:16:46.651Z',
  },
};

describe('Integrations routes', () => {
  before(async () => {
    await cleanDb();
    await pg('content_type').insert(contentType);
  });

  describe('contentfulWebhookHandler (client)', () => {
    it('can add new content', async () => {
      await request(app)
        .post('/api/v1/integrations/KK/contentful')
        .send(publishRequestBody)
        .set('x-contentful-topic', 'ContentManagement.Entry.publish')
        .expect(({ body }) => {
          expect(body).to.deep.equal({ data: { ok: true } });
        })
        .expect(200);

      const content = await pg('content').first();
      expect(content.externalId).to.equal(publishRequestBody.sys.id);
      expect(content.content.en.subject).to.equal(publishRequestBody.fields.subject.en);
    });

    it('can update content', async () => {
      await request(app)
        .post('/api/v1/integrations/KK/contentful')
        .send(publishRequestBody)
        .set('x-contentful-topic', 'ContentManagement.Entry.publish')
        .expect(({ body }) => {
          expect(body).to.deep.equal({ data: { ok: true } });
        })
        .expect(200);

      const content = await pg('content');
      expect(content.length).to.equal(1);
    });

    it('can delete content', async () => {
      await request(app)
        .post('/api/v1/integrations/KK/contentful')
        .send(deleteRequestBody)
        .set('x-contentful-topic', 'ContentManagement.Entry.delete')
        .expect(({ body }) => {
          expect(body).to.deep.equal({ data: { ok: true } });
        })
        .expect(200);

      const content = await pg('content');
      expect(content.length).to.equal(0);
    });
  });
});
