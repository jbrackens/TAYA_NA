 
// @flow
import type { SMSPlayerInfo, RenderOptions } from '../../../types/common';

const _ = require('lodash');
const contentful = require('contentful');

const pg = require('gstech-core/modules/pg');

const config = require('../../config');
const { parseTags } = require('../../utils');
const { getContentWithInfo } = require('../Content/repository');
const ContentfulImport = require('../Content/ContentfulImport');

const renderSms = async (
  contentId: Id,
  { firstName, currencyId, languageId }: SMSPlayerInfo,
  options: RenderOptions = {},
): Promise<{ brandId: BrandId, content: { [string]: string } }> => {
  const logPrefix = `smsRenderer:renderSms:${contentId}`;
  let rawContent;
  if (options.renderDraft) {
    // $FlowFixMe[incompatible-cast] options.brandId happened to be optional
    const client = contentful.createClient(config.contentful[(options.brandId: BrandId)].preview);
    const entry = await client.getEntry(contentId, { locale: '*' });
    const ci = new ContentfulImport((options.brandId: any));
    rawContent = ({
      content: { ...ci.map(entry.fields, ['type'], ['text']) },
      brandId: options.brandId,
    }: any);
  } else rawContent = await getContentWithInfo(pg, contentId);

  if (!rawContent) throw new Error(`${logPrefix} ERR:CONTENT_NONEXISTENT`);

  const { brandId, content } = rawContent;
  const localisedContent = languageId ? { [languageId]: content[languageId] } : content;
  if (languageId && !_.has(localisedContent, `${languageId}.text`))
    throw new Error(`${logPrefix}:${brandId} ERR:NO_LANG:${languageId}`);

  let parsedContent: { [string]: string } = {};
  Object.keys(localisedContent).forEach((lang) => {
    if (config.languages[brandId].map((l) => l.code).includes(lang))
      parsedContent = {
        ...parsedContent,
        [lang]: parseTags(
          // $FlowFixMe[invalid-computed-prop]
          localisedContent[lang].text,
          { name: firstName },
          { langCode: lang, currencyId },
        ),
      };
  });
  return { brandId, content: parsedContent };
};

module.exports = { renderSms };
