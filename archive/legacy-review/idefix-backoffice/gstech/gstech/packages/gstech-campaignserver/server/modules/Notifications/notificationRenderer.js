 
// @flow
import type { NotificationPlayerInfo, RenderOptions } from '../../../types/common';

const contentful = require('contentful');
const { marked } = require('marked');
const _ = require('lodash');
const Handlebars = require('handlebars');

const pg = require('gstech-core/modules/pg');
const { brandDefinitions } = require('gstech-core/modules/constants');

const config = require('../../config');
const { parseTags } = require('../../utils');
const { getContentWithInfo } = require('../Content/repository');
const ContentfulImport = require('../Content/ContentfulImport');

const htmlTemplate = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0" /><style>body{width:100%;}img{width:100%;}</style></head><body>{{#if imageUrl}}<img src="{{imageUrl}}"/>{{/if}}{{{content}}}</body></html>';

const renderNotification = async (
  contentId: Id | string,
  { firstName, currencyId, languageId }: NotificationPlayerInfo,
  options: RenderOptions = {},
): Promise<{ [string]: string }> => {
  let rawContent;
  if (options.renderDraft) {
    const client = contentful.createClient(config.contentful[((options.brandId: any): BrandId)].preview); // FIXME:  options.brandId happened to be optional
    const entry = await client.getEntry(contentId, {
      locale: ContentfulImport.mapLocale(languageId),
    });

    if (!entry.fields) {
      throw new Error(`Preview content of id ${contentId} does not exist`);
    }

    rawContent = {
      brandId: options.brandId,
      content: {
        [languageId]: { ..._.pick(entry.fields, ['content']) },
        ..._.pick(entry.fields, ['action', 'image']),
      },
    };
  } else {
    rawContent = await getContentWithInfo(pg, Number(contentId));
  }

  if (!rawContent) {
    throw new Error(`Content with id ${contentId} does not exist`);
  }

  const { content, brandId } = rawContent;
  const imageUrl = content.image && `${brandDefinitions[(brandId: any)].cdnUrl}/b/notifications/${content.image}`;

  const localisedContent = content[languageId.toLowerCase()];
  if (!localisedContent) {
    throw new Error('Language not avaialble');
  }

  const parsedContent = marked(
    parseTags(
      localisedContent.content,
      { name: firstName, link: content.action },
      { langCode: languageId, currencyId },
    ),
    { breaks: true },
  );

  const template = Handlebars.compile(htmlTemplate);
  return template({ content: parsedContent, imageUrl });
};

module.exports = {
  renderNotification,
};
