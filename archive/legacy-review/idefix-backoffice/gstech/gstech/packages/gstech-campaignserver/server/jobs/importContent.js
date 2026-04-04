 
/* @flow */
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const { brands } = require('gstech-core/modules/constants');

const ContentfulImport = require('../modules/Content/ContentfulImport');

const createContentType = async (brandId: any, type: string) => {
  const { id: contentTypeId } = await pg('content_type').where({ brandId, type }).first();

  if (contentTypeId) return contentTypeId;
  return await pg('content_type')
    .insert({ brandId, type })
    .returning('id')
    .then(([row]) => row?.id);
};

const createContent = async (
  contentTypeId: any,
  id: any,
  { externalId, type, enabled, ...rawContent }: any,
) => {
  const content = JSON.stringify(rawContent);
  const insert = pg('content').insert({
    contentTypeId,
    name: id,
    externalId,
    content,
    subtype: type,
    status: enabled !== undefined && !enabled ? 'draft' : 'published',
    active: !(enabled !== undefined && !enabled),
  });

  return pg.raw(
    `? ON CONFLICT ("externalId", "contentTypeId") DO UPDATE SET
    "name" = ?,
    "content" = ?`,
    [insert, id, content],
  );
};

module.exports = async () => {
  logger.info('importContent: starting...');

  await Promise.all(
    brands.map(async ({ id: brandId }: any) => {
      const ci = new ContentfulImport(brandId);

      return Promise.all(
        [
          // $FlowFixMe[method-unbinding]
          { type: 'email', method: ci.importMailers.bind(ci) },
          // $FlowFixMe[method-unbinding]
          { type: 'sms', method: ci.importMessages.bind(ci) },
          // $FlowFixMe[method-unbinding]
          { type: 'notification', method: ci.importNotifications.bind(ci) },
          // $FlowFixMe[method-unbinding]
          { type: 'localization', method: ci.importLocalizations.bind(ci) },
        ].map(async ({ type, method }) => {
          const contentType = await createContentType(brandId, type);
          const content = await method();

          return Promise.all(
            Object.keys(content).map(k => createContent(contentType, k, content[k])),
          );
        }),
      );
    }),
  );

  logger.info('importContent: completed.');
};
