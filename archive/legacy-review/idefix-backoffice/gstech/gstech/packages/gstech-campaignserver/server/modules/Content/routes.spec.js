/* @flow */

const request = require('supertest');

const pg = require('gstech-core/modules/pg');
const superClient = require('gstech-core/modules/superClient');
const ports = require('gstech-core/modules/ports');
const client = require('gstech-core/modules/clients/campaignserver-api');

const app = require('../../app');
const privateApp = require('../../app-private');
const { content, contentType } = require('../../mockData');
const { cleanDb } = require('../../utils');

describe('Content routes', () => {
  const localization = {
    name: 'localization',
    content: {
      server: false,
      format: 'markdown',
      brands: ['OS', 'KK'],
    },
    active: true,
  }
  before(async () => {
    await cleanDb();
    await pg('content_type').insert(contentType);
    await pg('content').insert(content);
  });

  describe('getContentList', () => {
    it('should return all KK emails', async () => {
      await request(app)
        .get('/api/v1/content?brandId=KK&contentType=email&excludeInactive=false')
        .expect(({ body }) => {
          expect(body.data).to.deep.have.members(
            [content[0], content[1], content[9]].map(({ content: c, ...rest }) => ({
              ...rest,
              content: JSON.parse(c),
              location: contentType[rest.contentTypeId - 1].location || '',
            })),
          );
        })
        .expect(200);
    });

    it('should return published KK emails (client)', async () => {
      await superClient(privateApp, ports.campaignServer.privatePort, client)
        .call((api) => api.getContentList('KK', { contentType: 'email', status: 'published' }))
        .expect(200, (result) => {
          expect(result).to.deep.have.members([
            { ...content[0], content: JSON.parse(content[0].content), location: '' },
          ]);
        });
    });

    it('should return KK emails excluding inactive', async () => {
      await superClient(privateApp, ports.campaignServer.privatePort, client)
        .call((api) => api.getContentList('KK', { contentType: 'email' }))
        .expect(200, (result) => {
          expect(result).to.deep.have.members([
            { ...content[0], content: JSON.parse(content[0].content), location: '' },
            { ...content[1], content: JSON.parse(content[1].content), location: '' },
          ]);
        });
    });
  });

  describe('createContent', () => {
    it('should create email content', async () => {
      const emailDraft = {
        content: {
          fi: {
            subject: 'New game Sticky Joker is live – play it with Free Spins!',
            text: 'New game Sticky Joker is live – play it with Free Spins!',
          },
          en: {
            subject: 'New game Sticky Joker is live – play it with Free Spins!',
            text: 'New game Sticky Joker is live – play it with Free Spins!',
          },
          image: 'banners/email/ld_stickyjoker_pre.jpg',
          lander: 'somelander',
        },
        name: '123d',
        subtype: 'transactional',
        type: 'email',
        brandId: 'KK',
        active: false,
      };

      await request(app)
        .post(`/api/v1/content`)
        .send(emailDraft)
        .expect(({ body }) => {
          expect(body.error, JSON.stringify(body.error)).to.equal(undefined);

          const { id, contentTypeId, ...email } = body.data;
          const { brandId, type, ...draft } = emailDraft;
          expect(email).to.containSubset({
            ...draft,
            updatedAt: body.data.updatedAt,
            status: 'draft',
            externalId: emailDraft.name,
          });
        })
        .expect(201);
    });
  });

  describe('updateContent', () => {
    it('schema requires email to contain subject and text', async () => {
      await request(app)
        .put(`/api/v1/content/${content[0].id}`)
        .send({
          ...content[0],
          content: { en: { subject: 'new subject' }, image: 'some_image.jpg' },
        })
        .expect(({ body }) => {
          expect(body.error.message).to.equal(
            'Content validation failed:\n{\n  "content,en,text": "Text is required"\n}',
          );
        })
        .expect(400);
    });

    it('can update email content', async () => {
      const newContent = {
        ...content[0],
        content: {
          fi: { subject: 'new subject', text: 'New text' },
          image: 'some_image.jpg',
        },
        active: false,
      };

      await request(app)
        .put(`/api/v1/content/${content[0].id}`)
        .send(newContent)
        .expect(({ body }) => {
          expect(body.data).to.deep.equal({ ...newContent, updatedAt: body.data.updatedAt });
        })
        .expect(200);
    });

    it('can update landingPage content', async () => {
      const newContent = {
        ...content[6],
        content: {
          fi: { text: 'new text fi', title: 'title fi' },
          en: { text: 'new text en', title: 'title en' },
          image: 'new image',
          tags: ['tag', 'new tag'],
        },
      };

      await request(app)
        .put(`/api/v1/content/${content[6].id}`)
        .send(newContent)
        .expect(({ body }) => {
          expect(body.data).to.deep.equal({ ...newContent, updatedAt: body.data.updatedAt });
          expect(body.data.updatedAt).to.not.equal(content[6].updatedAt);
        })
        .expect(200);
    });

    it('returns error if banner location does not exist', async () => {
      const newContent = {
        ...content[7],
        content: JSON.parse(content[7].content),
        location: 'deposit',
      };

      await request(app)
        .put(`/api/v1/content/${content[7].id}`)
        .send(newContent)
        .expect(({ body }) => {
          expect(body.error.message).to.equal('Incorrect location "deposit"');
        })
        .expect(404);
    });

    it('can update banner content', async () => {
      const [cT] = await pg('content_type')
        .insert({ id: 100, type: 'banner', location: 'deposit', brandId: 'KK' })
        .returning('id');
      expect(cT.id).to.exist();
      const newContent = {
        ...content[7],
        content: {
          fi: { text: 'new text fi', heading: 'heading fi' },
          en: { text: 'new text en', heading: 'heading en' },
        },
        location: 'deposit',
      };

      await request(app)
        .put(`/api/v1/content/${content[7].id}`)
        .send(newContent)
        .expect(({ body }) => {
          expect(body.data).to.deep.equal({
            ...newContent,
            updatedAt: body.data.updatedAt,
            contentTypeId: cT.id,
          });
        })
        .expect(200);
    });
  });

  describe('createLocalization', () => {
    it('can create localizations', async () => {
      await request(app)
        .post('/api/v1/content/localizations')
        .send(localization)
        .expect(({ body }) => {
          expect(body).to.containSubset({ data: { ...localization, contentTypeId: 7 } });
        })
        .expect(201)
    });
  });

  describe('getLocalizations', () => {
    it('can get localizations for brand', async () => {
      await request(app)
        .get(`/api/v1/content/localizations?brandId=OS`)
        .expect(({ body }) => {
          expect(body.data.length).to.equal(1);
          expect(body).to.containSubset({ data: [localization] });
        })
        .expect(200)
    })
  });

  describe('deleteContent', () => {
    it('returns an error if the content does not exist', async () => {
      await request(app)
        .delete(`/api/v1/content/1241251`)
        .expect(({ body }) => {
          expect(body).to.deep.equal({ error: { message: 'Not able to delete content 1241251' } });
        })
        .expect(409);
    });

    it('should delete existing content', async () => {
      await request(app)
        .delete(`/api/v1/content/${content[7].id}`)
        .expect(({ body }) => {
          expect(body).to.deep.equal({ data: { ok: true } });
        })
        .expect(200);
    });
  });
});
