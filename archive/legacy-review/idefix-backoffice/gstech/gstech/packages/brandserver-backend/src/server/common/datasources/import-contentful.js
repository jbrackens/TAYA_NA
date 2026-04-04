/* @flow */
const campaignserverClient = require('gstech-core/modules/clients/campaignserver-api');
const logger = require('gstech-core/modules/logger');

const configuration = require('../configuration');

const parseContent = async (
  contentType: 'notifications' | 'mailers' | 'messages',
  exportData: ((id: string, data: any) => Promise<void>),
  errors: Array<string>,
  contentList: any[],
) => {
  // TODO: it should be enabled: active, but because there's discrepancy between status and enabled can't do that now.
  // TODO: Need to migrate the data somehow
  const parsedContent = contentList.map(({ status, subtype, name, content }) => ({
    enabled: status === 'published',
    type: subtype,
    id: name,
    ...content,
  }));
  await exportData(contentType, parsedContent);
  const message = `${parsedContent.length} ${contentType} imported`;
  logger.debug(message);
  errors.push(message);
};

module.exports = async (exportData: (id: string, data: any) => Promise<void>): Promise<Array<string>> => {
  const errors: string[] = [];
  const data = await campaignserverClient.getContentList(configuration.shortBrandId(), { contentType: 'notification', excludeInactive: false });
  await parseContent('notifications', exportData, errors, data);
  return errors;
};