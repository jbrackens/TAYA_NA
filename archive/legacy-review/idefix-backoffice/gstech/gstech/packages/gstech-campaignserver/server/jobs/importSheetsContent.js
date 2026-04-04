/* @flow */
/* eslint-disable no-param-reassign */

import type { ContentDraft } from 'gstech-core/modules/types/campaigns';

const sheets = require('gstech-core/modules/sheets');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { upsert2 } = require('gstech-core/modules/knex');
const _ = require('lodash');

const config = require('../config');
const { upsertContent } = require('../modules/Content/repository');

type Row = {
  id: string,
  enabled: 'TRUE' | 'FALSE' | '',
  bonuscode: string,
  bonusavailable: string,
  tags: string,
  image: string,
  type: string,
  features: string,
  location: string,
  promotion: string,
  priority: number,
  weight: number,
  action: string,
  source?: string,
  wageringrequirement?: number,
  titleen: string,
  subtitleen: string,
  texten: string,
  actionheadingen: string,
  additionalinfoheaden: string,
  additionalinfoen: string,
  titlede: string,
  subtitlede: string,
  textde: string,
  actionheadingde: string,
  additionalinfoheadde: string,
  additionalinfode: string,
  titlefi: string,
  subtitlefi: string,
  textfi: string,
  actionheadingfi: string,
  additionalinfoheadfi: string,
  additionalinfofi: string,
  titlesv: string,
  subtitlesv: string,
  textsv: string,
  actionheadingsv: string,
  additionalinfoheadsv: string,
  additionalinfosv: string,
  titleno: string,
  subtitleno: string,
  textno: string,
  actionheadingno: string,
  additionalinfoheadno: string,
  additionalinfono: string,
};

const upsertContentWrapper = async (
  row: Row,
  contentTypeId: any,
  content: | {
        action: string,
        bonus: string,
        priority: number,
        promotion: string,
        source: void | string,
        tags: Array<string>,
        wageringRequirement: number,
        weight: number,
      }
    | {
        bonus: string,
        image: string,
        location: string,
        source: void | string,
        tags: Array<string>,
      },
) => {
  const contentDraft: ContentDraft = {
    contentTypeId,
    externalId: row.id,
    name: row.id,
    status: 'published',
    subtype: row.type,
    content,
    active: row.enabled === 'TRUE',
  };

  return upsertContent(pg, contentDraft);
};

const processLandingPage = async (rows: Row[], brandId: BrandId, errors: any[]) => {
  const contentType = await upsert2(pg, 'content_type', { type: 'landingPage', brandId }, [
    'type',
    'brandId',
    'location',
  ]);
  for (const row of rows) {
    try {
      const content = {
        tags: row.tags ? row.tags.split(',') : [],
        image: row.image,
        location: row.location,
        source: row.source,
        bonus: row.bonuscode || row.bonusavailable,
      };
      config.languages[brandId].forEach(({ code: lang }) => {
        // $FlowFixMe[prop-missing]
        content[lang] = {
          // $FlowFixMe[invalid-computed-prop]
          title: row[`title${lang}`],
          // $FlowFixMe[invalid-computed-prop]
          subtitle: row[`subtitle${lang}`],
          // $FlowFixMe[invalid-computed-prop]
          text: row[`text${lang}`],
          // $FlowFixMe[invalid-computed-prop]
          actionHeading: row[`actionheading${lang}`],
          // $FlowFixMe[invalid-computed-prop]
          additionalInfoHead: row[`additionalinfohead${lang}`],
          // $FlowFixMe[invalid-computed-prop]
          additionalInfo: row[`additionalinfo${lang}`],
          // $FlowFixMe[invalid-computed-prop]
          action: row[`action${lang}`],
        };
      });

      await upsertContentWrapper(row, contentType.id, content);
    } catch (e) {
      errors.push(e.message || e);
    }
  }
};

const processBanners = async (
  rows: Row[],
  location: string,
  brandId: BrandId,
  errors: any[],
  globalBanners: { [key: string]: number },
) => {
  for (const row of rows) {
    const contentType = await upsert2(
      pg,
      'content_type',
      { type: 'banner', brandId, location: row.location || location },
      ['type', 'brandId', 'location'],
    );
    if (globalBanners[row.id]) {
      globalBanners[row.id] = +1;
      row.source = row.id;
      row.id = `${row.id}-${globalBanners[row.id]}`;
    } else {
      globalBanners[row.id] = 1;
    }
    row.type = row.type || 'internal';
    try {
      const content = {
        tags: row.tags ? row.tags.split(',') : [],
        promotion: row.promotion || '',
        priority: row.priority ? Number(row.priority) : 0,
        weight: row.weight ? Number(row.weight) : 1,
        action: row.action || '',
        source: row.source,
        bonus: row.bonuscode || row.bonusavailable,
        wageringRequirement: row.wageringrequirement ? Number(row.wageringrequirement) : 0,
      };
      config.languages[brandId].forEach(({ code: lang }) => {
        // $FlowFixMe[prop-missing]
        content[lang] = {
          // $FlowFixMe[invalid-computed-prop]
          heading: row[`heading${lang}`],
          // $FlowFixMe[invalid-computed-prop]
          text: row[`text${lang}`],
          // $FlowFixMe[invalid-computed-prop]
          action: row[`actiontext${lang}`],
          // $FlowFixMe[invalid-computed-prop]
          title: row[`title${lang}`],
          // $FlowFixMe[invalid-computed-prop]
          subheading: row[`subheading${lang}`],
          // $FlowFixMe[invalid-computed-prop]
          disclaimer: row[`disclaimer${lang}`],
        };
      });

      await upsertContentWrapper(row, contentType.id, content);
    } catch (e) {
      errors.push(e.message || e);
    }
  }
};

const importSheetsContent = async () => {
  const errors: any[] = [];
  const globalBanners = {};
  const brandId: any = _.last(process.argv);
  console.log('Process', brandId);
  const [landingPages, ...banners] = await sheets.openSheets(
    config.sheets[brandId].landingPages,
    [
      'LandingPages',
      'Frontpage Banners',
      'Deposit Banners',
      'Game sidebar banners',
      'Non-loggedin Banners',
    ],
    config.google.api,
  );

  await processLandingPage(landingPages, brandId, errors);
  await processBanners(banners[0], 'frontpage', brandId, errors, globalBanners);
  await processBanners(banners[1], 'deposit', brandId, errors, globalBanners);
  await processBanners(banners[2], 'game-sidebar', brandId, errors, globalBanners);
  await processBanners(banners[3], 'nonloggedin', brandId, errors, globalBanners);

  if (errors.length) {
    logger.error(JSON.stringify(errors, null, 2));
  }
};

module.exports = importSheetsContent;
