 
// @flow
import type { EmailPlayerInfo, RenderOptions } from '../../../types/common';

const _ = require('lodash');
const inline = require('inline-css');
const { axios } = require('gstech-core/modules/axios');
const Handlebars = require('handlebars');
const { marked } = require('marked');
const validUrl = require('valid-url');

const { brandDefinitions } = require('gstech-core/modules/constants');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const ContentfulImport = require('../Content/ContentfulImport');
const { getContentByName, getContentWithInfo } = require('../Content/repository');
const { parseTags } = require('../../utils');
const config = require('../../config');

const emailProps = {
  CJ: {
    inline: {
      url: brandDefinitions.CJ.cdnUrl,
      extraCss: `
      p,h1,h2,h3,h4,h5,h6,span,div,th,td {font-family: "Titillium Web", sans-serif; text-align: left;}
      h1 {font-size: 18px;}
      h1,h2,h3,h4,h5,h6 {color: #333333;}
      p {margin: 10px 0;}
      p,th,td {color: #666666; font-size: 13px;}
      blockquote {margin: 0;}
      blockquote p {font-weight: bold;}
      table {width: 100%; border-collapse: separate; border-radius: 4px; border-spacing: 0; border: 1px solid #595959; margin: 0 0 20px;}
      th,td {padding: 10px; border-left: 1px solid #595959; border-top: 1px solid #595959;}
      th {border-top: none;}
      th:first-child,td:first-child {border-left: none;}
    `,
    },
    footerInline: {
      url: brandDefinitions.KK.cdnUrl,
      extraCss: `p {text-align: center; font-family: "Titillium Web", sans-serif; color: #8c8c8c; font-size: 10px;}`,
    },
    linkTemplate:
      '<a style="background-color:#90CC00; border:0px solid #333333; border-color:#333333; border-radius:4px; border-width:0px; color:#ffffff; display:block; font-size:14px; font-weight:bold; letter-spacing:0px; line-height:normal; padding:12px 0px 12px 0px; text-align:center; text-decoration:none; border-style:solid; font-family:helvetica,sans-serif; width:280px; max-width: 100%; margin: 20px auto;" target="_blank" href="{{link}}">{{value}}</a>',
  },
  FK: {
    inline: {
      url: brandDefinitions.FK.cdnUrl,
      extraCss: `
      p,h1,h2,h3,h4,h5,h6,span,div,th,td {font-family: "PT Sans", sans-serif; text-align: left;}
      h1 {font-size: 18px;}
      h1,h2,h3,h4,h5,h6 {color: #171721;}
      p {margin: 10px 0;}
      p,th,td {color: #595959; font-size: 13px;}
      blockquote {margin: 0;}
      blockquote p {font-weight: bold;}
      table {width: 100%; border-collapse: separate; border-radius: 4px; border-spacing: 0; border: 1px solid #595959; margin: 0 0 20px;}
      th,td {padding: 10px; border-left: 1px solid #595959; border-top: 1px solid #595959;}
      th {border-top: none;}
      th:first-child,td:first-child {border-left: none;}
    `,
    },
    footerInline: {
      url: brandDefinitions.FK.cdnUrl,
      extraCss: `p {text-align: center; font-family: "PT Sans", sans-serif; color: #8c8c8c; font-size: 10px;}`,
    },
    linkTemplate:
      '<a style="background-color:#FFD000; border:0px solid #333333; border-color:#333333; border-radius:4px; border-width:0px; color:#171721; display:block; font-size:14px; font-weight:bold; letter-spacing:0px; line-height:normal; padding:12px 0px 12px 0px; text-align:center; text-decoration:none; border-style:solid; font-family:helvetica,sans-serif; width:280px; max-width: 100%; margin: 20px auto;" target="_blank" href="{{link}}">{{value}}</a>',
  },
  KK: {
    inline: {
      url: brandDefinitions.KK.cdnUrl,
      extraCss: `
      p,h1,h2,h3,h4,h5,h6,span,div,th,td {font-family: "PT Sans", sans-serif; text-align: left;}
      h1 {font-size: 18px;}
      h1,h2,h3,h4,h5,h6 {color: #333333;}
      p {margin: 10px 0;}
      p,th,td {color: #666666; font-size: 13px;}
      blockquote {margin: 0;}
      blockquote p {font-weight: bold;}
      table {width: 100%; border-collapse: separate; border-radius: 4px; border-spacing: 0; border: 1px solid #595959; margin: 0 0 20px;}
      th,td {padding: 10px; border-left: 1px solid #595959; border-top: 1px solid #595959;}
      th {border-top: none;}
      th:first-child,td:first-child {border-left: none;}
    `,
    },
    footerInline: {
      url: brandDefinitions.KK.cdnUrl,
      extraCss: `p {text-align: center; font-family: "PT Sans", sans-serif; color: #8c8c8c; font-size: 10px;}`,
    },
    linkTemplate:
      '<a style="background-color:#0d47a1; border:0px solid #333333; border-color:#333333; border-radius:4px; border-width:0px; color:#ffffff; display:block; font-size:14px; font-weight:bold; letter-spacing:0px; line-height:normal; padding:12px 0px 12px 0px; text-align:center; text-decoration:none; border-style:solid; font-family:helvetica,sans-serif; width:280px; max-width: 100%; margin: 20px auto;" target="_blank" href="{{link}}">{{value}}</a>',
  },
  OS: {
    inline: {
      url: brandDefinitions.OS.cdnUrl,
      extraCss: `
      p,h1,h2,h3,h4,h5,h6,span,div,th,td {font-family: "PT Sans", sans-serif; text-align: left;}
      h1 {font-size: 18px;}
      h1,h2,h3,h4,h5,h6 {color: #333333;}
      p {margin: 10px 0;}
      p,th,td {color: #666666; font-size: 13px;}
      blockquote {margin: 0;}
      blockquote p {font-weight: bold;}
      table {width: 100%; border-collapse: separate; border-radius: 4px; border-spacing: 0; border: 1px solid #595959; margin: 0 0 20px;}
      th,td {padding: 10px; border-left: 1px solid #595959; border-top: 1px solid #595959;}
      th {border-top: none;}
      th:first-child,td:first-child {border-left: none;}
    `,
    },
    footerInline: {
      url: brandDefinitions.KK.cdnUrl,
      extraCss: `p {text-align: center; font-family: "PT Sans", sans-serif; color: #8c8c8c; font-size: 10px;}`,
    },
    linkTemplate:
      '<a style="background-color:#B43492; border:0px solid #333333; border-color:#333333; border-radius:4px; border-width:0px; color:#ffffff; display:block; font-size:14px; font-weight:bold; letter-spacing:0px; line-height:normal; padding:12px 0px 12px 0px; text-align:center; text-decoration:none; border-style:solid; font-family:helvetica,sans-serif; width:280px; max-width: 100%; margin: 20px auto;" target="_blank" href="{{link}}">{{value}}</a>',
  },
  LD: {
    inline: {
      url: brandDefinitions.LD.cdnUrl,
      extraCss: `
      p,h1,h2,h3,h4,h5,h6,span,div,th,td {font-family: "Titillium Web", sans-serif; text-align: left;}
      h1 {font-size: 18px;}
      h1,h2,h3,h4,h5,h6 {color: #333333;}
      p {margin: 10px 0;}
      p,th,td {color: #666666; font-size: 13px;}
      blockquote {margin: 0;}
      blockquote p {font-weight: bold;}
      table {width: 100%; border-collapse: separate; border-radius: 4px; border-spacing: 0; border: 1px solid #595959; margin: 0 0 20px;}
      th,td {padding: 10px; border-left: 1px solid #595959; border-top: 1px solid #595959;}
      th {border-top: none;}
      th:first-child,td:first-child {border-left: none;}
    `,
    },
    footerInline: {
      url: brandDefinitions.KK.cdnUrl,
      extraCss: `p {text-align: center; font-family: "Titillium Web", sans-serif; color: #8c8c8c; font-size: 10px;}`,
    },
    linkTemplate:
      '<a style="background-color:#26C6DA; border:0px solid #333333; border-color:#333333; border-radius:4px; border-width:0px; color:#ffffff; display:block; font-size:14px; font-weight:bold; letter-spacing:0px; line-height:normal; padding:12px 0px 12px 0px; text-align:center; text-decoration:none; border-style:solid; font-family:helvetica,sans-serif; width:280px; max-width: 100%; margin: 20px auto;" target="_blank" href="{{link}}">{{value}}</a>',
  },
  SN: {
    inline: {
      url: brandDefinitions.SN.cdnUrl,
      extraCss: `
      p,h1,h2,h3,h4,h5,h6,span,div,th,td {font-family: "Titillium Web", sans-serif; text-align: left;}
      h1 {font-size: 18px;}
      h1,h2,h3,h4,h5,h6 {font-family: 'Poppins', sans-serif; font-weight: 900; color: #171721;}
      p {margin: 10px 0;}
      p,th,td {color: #595959; font-size: 13px;}
      blockquote {margin: 0;}
      blockquote p {font-weight: bold;}
      table {width: 100%; border-collapse: separate; border-radius: 4px; border-spacing: 0; border: 1px solid #595959; margin: 0 0 20px;}
      th,td {padding: 10px; border-left: 1px solid #595959; border-top: 1px solid #595959;}
      th {border-top: none;}
      th:first-child,td:first-child {border-left: none;}
    `,
    },
    footerInline: {
      url: brandDefinitions.SN.cdnUrl,
      extraCss: `p {text-align: center; font-family: "Titillium Web", sans-serif; color: #8c8c8c; font-size: 10px;}`,
    },
    linkTemplate:
      '<a style="background-color:rgb(240, 30, 93); border:2px solid #000000; border-color:#000000; border-radius:4px; color:#ffffff; display:block; font-size:14px; font-weight:bold; letter-spacing:0; line-height:normal; padding:12px 0 12px 0; text-align:center; text-decoration:none; font-family:helvetica,sans-serif; width:280px; max-width: 100%; margin: 20px auto;" target="_blank" href="{{link}}">{{value}}</a>',
  },
  VB: {
    inline: {
      url: brandDefinitions.VB.cdnUrl,
      extraCss: `
      p,h1,h2,h3,h4,h5,h6,span,div,th,td {font-family: 'Mulish', sans-serif; text-align: left;}
      h1 {font-size: 18px;}
      h1,h2,h3,h4,h5,h6 {color: #FFFFFF;}
      p {margin: 10px 0;}
      p,th,td {color: #FFFFFF; font-size: 13px;}
      blockquote {margin: 0;}
      blockquote p {font-weight: bold;}
      table {width: 100%; border-collapse: separate; border-radius: 4px; border-spacing: 0; border: 1px solid #595959; margin: 0 0 20px;}
      th,td {padding: 10px; border-left: 1px solid #595959; border-top: 1px solid #595959;}
      th {border-top: none;}
      th:first-child,td:first-child {border-left: none;}
    `,
    },
    footerInline: {
      url: brandDefinitions.VB.cdnUrl,
      extraCss: `p {text-align: center; font-family: 'Mulish', sans-serif; color: #FFFFFF; font-size: 10px;}`,
    },
    linkTemplate:
      '<a style="background-color:#00B75B; border:0 solid #333333; border-color:#333333; border-radius:4px; border-width:0; color:#FFFFFF; display:block; font-size:14px; font-weight:bold; letter-spacing:0; line-height:normal; padding:12px 0 12px 0; text-align:center; text-decoration:none; border-style:solid; font-family:helvetica,sans-serif; width:280px; max-width: 100%; margin: 20px auto;" target="_blank" href="{{link}}">{{value}}</a>',
  },
};

const landerLink = (lander: string, brandId: BrandId, lang: string) => {
  if (lander) {
    if (validUrl.isUri(lander)) return lander;
    return `${brandDefinitions[brandId].url}/${lang}/promo/${lander}/`;
  }
  return `${brandDefinitions[brandId].url}/`;
};

const prepareContent = async (
  knex: Knex,
  contentId: Id | string,
  { firstName, currencyId, languageId }: EmailPlayerInfo,
  subscriptionToken: string,
  options: RenderOptions = {},
): Promise<{
  content: string,
  footer: string,
  subject: string,
  imageUrl: string,
  brandId: BrandId,
}> => {
  const logPrefix = `EmailRenderer:prepareContent:${contentId}`;
  let rawContent;
  if (options.renderDraft) {
    const brandId = options.brandId || 'LD';
    const ci = new ContentfulImport(brandId, 'preview');
    const entry = await ci.client.getEntry((contentId: any), { locale: '*' });
    if (!entry.fields) throw new Error(`${logPrefix} ERR:PREVIEW_NONEXISTENT`);
    const parsedEntry = ci.parseMailers([entry]);
    rawContent = { brandId, content: parsedEntry[Object.keys(parsedEntry)[0]] };
  } else {
    rawContent = await getContentWithInfo(knex, Number(contentId));
    if (!rawContent) throw new Error(`${logPrefix} ERR:CONTENT_NONEXISTENT`);
  }

  const { brandId, content } = rawContent;

  // Process the content
  const contentLangCode = config.languages[brandId][0].code;
  const localizedContent = content[languageId] || content[contentLangCode];
  if (!content[languageId]) logger.warn(`!!! ${logPrefix} NO_LANG:${languageId}`);
  if (!localizedContent) throw new Error(`${logPrefix}:${brandId} ERR:NO_LANG:${contentLangCode}`);
  const parsedContent = marked(
    parseTags(
      localizedContent.text,
      {
        name: firstName,
        link: options.link || landerLink(content.lander, brandId, languageId),
        ...(options.values || {}: any),
      },
      { langCode: languageId, linkTemplate: emailProps[brandId].linkTemplate, currencyId },
    ),
    { breaks: true },
  );

  // Get and process footer
  const footer = await getContentByName(knex, brandId, 'mailer-footer');
  if (!footer) throw new Error(`${logPrefix}:${brandId} ERR:FOOTER_NOT_FOUND`);

  const localizedFooter =
    _.get(footer, `content.${languageId}.text`) || _.get(footer, `content.en.text`);
  if (!localizedFooter)
    throw new Error(`${logPrefix}:${brandId} ERR:FOOTER_LANG_NOT_FOUND:${languageId}`);

  const unsubscribeLink = `https://${config.sendGrid[brandId].domain}/${languageId}/subscriptions?token=${subscriptionToken}`;
  const parsedFooter = marked(parseTags(localizedFooter, { link: unsubscribeLink }));

  // Inline css in content and footer
  const inlineStyledContent = await inline(
    parsedContent,
    emailProps[brandId].inline || emailProps.LD.inline,
  );

  const inlineFooter = await inline(
    parsedFooter,
    emailProps[brandId].footerInline || emailProps.LD.footerInline,
  );

  let imageUrl;
  if (content.image) {
    const index = content.image.search(/\/([^/]*?)$/);
    if (index > -1) imageUrl = content.image.slice(index + 1);
  }

  imageUrl = imageUrl ? `${brandDefinitions[brandId].cdnUrl}/b/email/${imageUrl}` : '';
  return {
    content: inlineStyledContent,
    footer: inlineFooter,
    imageUrl,
    brandId,
    subject: parseTags(localizedContent.subject, { name: firstName }),
  };
};

const renderEmail = async (
  contentId: Id | string,
  playerInfo: EmailPlayerInfo,
  options: RenderOptions = {},
): Promise<any> => {
  const { brandId, ...preparedContent } = await prepareContent(
    pg,
    contentId,
    playerInfo,
    '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
    options,
  );

  const { data: sendGridObj } = await axios.get(
    `https://api.sendgrid.com/v3/templates/${config.sendGrid[brandId].templateId}`,
    {
      headers: {
        Authorization: `Bearer ${config.sendGrid.apiKeys.template}`,
      },
    },
  );

  if (!sendGridObj) throw new Error('Problems fetching email template');

  const html = sendGridObj.versions[0].html_content;
  const template = Handlebars.compile(html);
  return template(preparedContent);
};

module.exports = {
  renderEmail,
  prepareContent,
};
