/* @flow */
import type { Notification } from './content-types';

const contentful = require('contentful');
const configuration = require('../configuration');
const localization = require('../localization');
const config = require('../config');

const client = contentful.createClient(config.contentful[configuration.shortBrandId()]);

const localeMapping = {
  no: 'nb',
};

// $FlowFixMe[invalid-computed-prop]
const mapLocale = (locale: string): any => localeMapping[locale] || locale;

const defaultLocalizationField = (data: { [key: string]: string }, field: string) =>
  data[field] ? data[field][mapLocale(localization.defaultLanguage().code)] : '';

const map = (data: { [key: string]: string }, fields: Array<string>, localizedFields: Array<string>) => {
  const result: { [any | string]: any | string } = {};
  fields.forEach((field) => {
    result[field] = defaultLocalizationField(data, field);
  });

  localizedFields.forEach((field) => {
    configuration.languages().map(lang => lang.code).forEach((lang) => {
      result[lang] = result[lang] || {};
      if (data[field]) {
        // $FlowFixMe[incompatible-use]
        result[lang][field] = data[field][mapLocale(lang)];
      }
    });
  });
  return result;
};

const parseArray = async (type: string, fields: Array<string>, localizedFields: Array<string>) => {
  const { items } = await client.getEntries({ content_type: type, limit: 1000, locale: '*', order: '-sys.createdAt' });
  return items.map(item => item.fields).map((d) => map(d, fields, localizedFields));
};

const parseNotifications = async (exportData: (id: string, data: Notification[]) => Promise<void>, errors: string[]) => {
  const raw = await parseArray('notification', ['priority', 'action', 'id', 'type', 'tags', 'bonus', 'important', 'openOnLogin', 'image'], ['title', 'content', 'actiontext', 'disclaimer']);
  const notifications: Notification[] = raw.map(({ bonus, tags, type, priority, ...rest }) => {
    const p = priority !== '' ? priority : 1000;
    return { enabled: true, type: type || '', action: '', image: '', rules: { priority: p, bonus: bonus || undefined, tags: tags.split(',').filter(x => x !== '') }, ...rest };
  });
  exportData('notifications', notifications);
  errors.push(`${notifications.length} notifications imported`);
};

module.exports = { parseNotifications, mapLocale };
