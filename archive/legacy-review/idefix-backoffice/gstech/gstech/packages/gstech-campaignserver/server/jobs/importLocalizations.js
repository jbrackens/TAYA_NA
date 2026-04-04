/* @flow */

import type { ContentDraft } from 'gstech-core/modules/types/campaigns';

const sheets = require('gstech-core/modules/sheets');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { brands } = require('gstech-core/modules/constants');

const config = require('../config');
const { upsertContent } = require('../modules/Content/repository');

type Row = {
  key: string,
  site: string,
  format: string,
  server: ?'TRUE',
  en: string,
  de: string,
  fi: string,
  sv: string,
  no: string,
};

const upsertContentWrapper = async (row: Row, contentTypeId: Id, content: {
  brands: Array<BrandId>,
  format: string,
  server: boolean,
}) => {
  const contentDraft: ContentDraft = {
    contentTypeId,
    externalId: row.key,
    name: row.key,
    status: 'published',
    subtype: '',
    content,
    active: true,
  };

  return upsertContent(pg, contentDraft);
};

const processLocalizations = async (rows: Row[], contentTypeId: Id, errors: any[]) => {
  for (const row: Row of rows) {
    try {
      if (!(row.key && row.key.trim())) {
        return;
      }

      const availableBrands = row.site
        ? [
            ...row.site
              .split(',')
              .map((b) => (brands.find(({ site }) => site === b.trim().toLowerCase()): any).id),
            ...(row.site.toLowerCase().includes('kalevala') ? ['FK'] : []),
          ]
        : brands.map(({ id }) => id);
      const content = {
        format: row.format,
        server: row.server === 'TRUE',
        brands: availableBrands,
      };
      config.languages.LD.forEach(({ code: lang }) => {
        // $FlowFixMe[prop-missing]
        content[lang] = {
          // $FlowFixMe[invalid-computed-prop]
          text: row[lang],
        };
      });

      await upsertContentWrapper(row, contentTypeId, content);
    } catch (e) {
      errors.push(e.message || e);
    }
  }
};

const importSheetsContent = async () => {
  const errors: any[] = [];

  const contentType = await pg('content_type')
    .where({ type: 'localization', brandId: 'LD' })
    .first();

  const [localizations] = await sheets.openSheets(
    (config.sheets.LD.localizations: any),
    ['Localizations'],
    config.google.api,
  );

  await processLocalizations(localizations, contentType.id, errors);

  if (errors.length) {
    logger.error(JSON.stringify(errors, null, 2));
  }
};

module.exports = importSheetsContent;
