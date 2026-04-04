// @flow
import type { CampaignStatus, Campaign } from '../types/common';

const { parse } = require('csv-parse/sync'); // eslint-disable-line import/no-unresolved
const { Money } = require('gstech-core/modules/money-class');
const { flatten } = require('lodash');
const Handlebars = require('handlebars');
const fs = require('fs-extra');
const path = require('path');

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { formatCurrency } = require('gstech-core/modules/money');

const config = require('./config');

type CampaignTimeAndStatusCheckOptions = {
  status?: CampaignStatus,
  allowPreviewMode?: boolean,
};

const addCampaignTimeAndStatusCheck = (
  qb: Knex$QueryBuilder<Campaign>,
  options: CampaignTimeAndStatusCheckOptions = {},
): Knex$QueryBuilder<Campaign> =>
  qb
    .andWhere((qb) =>
      qb
        .where({ 'campaigns.status': options.status || 'running' })
        .modify((qb) =>
          options.allowPreviewMode ? qb.orWhere({ 'campaigns.previewMode': true }) : qb,
        ),
    )
    .andWhere((qb) =>
      qb
        .where({ 'campaigns.startTime': null })
        .orWhere('campaigns.startTime', '<=', pg.raw('now()')),
    )
    .andWhere((qb) =>
      qb.where({ 'campaigns.endTime': null }).orWhere('campaigns.endTime', '>=', pg.raw('now()')),
    );

const cleanDb = async () => {
  await pg('campaigns_players').delete();
  await pg('campaigns_deposits').delete();
  await pg('credited_rewards').delete();
  await pg('deposits').delete();
  await pg('audience_rules').delete();
  await pg('reward_rules').delete();
  await pg('events').delete();
  await pg('campaigns_content').delete();
  await pg('content').delete();
  await pg('content_type').delete();
  await pg('campaigns').delete();
  await pg('campaign_groups').delete();
  await pg('players').delete();
  await pg('subscription_options').delete();
  await pg('countries').delete();
};

const contentStatsReducer = (
  acc: { id: string, name: string, value: number }[],
  curr: any,
): Array<{ id: string, name: string, value: number }> => {
  const index = acc.findIndex((a) => a.id === curr.text);
  if (index !== -1) {
    acc[index].value += 1;
  }
  return acc;
};

const createCSVString = (
  headers: { id: string, title: string }[],
  values: { [key: string]: any }[],
  delimiter: string = ',',
): string => {
  const rows = [];
  rows.push(headers.map(header => header.title).join(delimiter));
  values.map(value => rows.push(headers.map(header => value[header.id]).join(delimiter)));
  return rows.join('\r\n');
};

const getDraftPreviewWrapper = async (
  contentType: 'emails' | 'notifications' | 'smses',
  brandId: BrandId,
  contentfulId: string,
): Promise<string> => {
  const url = `/api/v1/${contentType}/${contentfulId}/preview-draft?brandId=${brandId}`
  const wrapperFile = await fs.readFile(path.join(__dirname, 'draft-preview.hbs'));
  const template = Handlebars.compile(wrapperFile.toString());
  return template({
    url,
    languages: config.languages[((brandId.toUpperCase(): any): BrandId)].map(({ code }) => code), // FIXME: .toUpperCase() shouldn't be needed I guess
  });
};

const parseCSVList = (input: string | Buffer): string[] => {
  const list = parse(input, {
    skip_empty_lines: true,
  });

  return flatten(list);
};

const defaultLinkTemplate = '<a href="{{{link}}}">{{value}}</a>';

const parseTags = (
  text: string = '',
  values: { [string]: any },
  options: {
    currencyId?: string,
    langCode?: string,
    linkTemplate?: string,
  } = {},
): string => {
  const simpleRegex = /{[\w\s]+}/g;
  const optionRegex = /{[\w\s]+?[:|][^:|]+?}/g;

  let result = text.replace(simpleRegex, match => {
    const cleanMatch = match.replace(/[{}]/g, '');
    const value = values[cleanMatch] || '';
    if (!value) {
      logger.warn(`Cannot find value for key "${cleanMatch}" in "${text}"`);
    }
    return value;
  });
  result = result.replace(optionRegex, match => {
    const cleanMatch = match.replace(/[{}]/g, '');
    const [name, value] = cleanMatch.split(/[:|]/);
    if (name === 'currency') {
      const currencyId = options.currencyId || 'EUR';
      return formatCurrency(Number(Money.parse(value, 'EUR').asCurrency(currencyId).asFloat()), currencyId, options.langCode || 'en', false);
    }
    if (name === 'link') {
      const template = Handlebars.compile(options.linkTemplate || defaultLinkTemplate);
      return template({ link: values.link, value });
    }
    logger.warn(`"${name}" tag is not supported in "${text}"`);
    return '';
  });

  return result;
};

const asyncForEach = async <T>(array: Array<T>, callback: (T) => Promise<any>): Promise<any[]> => {
  const results = [];
  // eslint-disable-next-line no-plusplus
  for (let index = 0; index < array.length; index++) {
    results.push(await callback(array[index]));
  }
  return results;
}

module.exports = {
  addCampaignTimeAndStatusCheck,
  cleanDb,
  asyncForEach,
  contentStatsReducer,
  createCSVString,
  getDraftPreviewWrapper,
  parseCSVList,
  parseTags,
};
