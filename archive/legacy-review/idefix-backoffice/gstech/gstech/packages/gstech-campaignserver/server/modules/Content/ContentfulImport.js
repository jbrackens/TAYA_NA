/* @flow */

const contentful = require('contentful');
const logger = require('gstech-core/modules/logger');
const config = require('../../config');

export type ContentfulClientApi = {
  getAsset(id: string, query?: any): Promise<Object>,
  getAssets(query?: any): Promise<Object>,
  getContentType(id: string): Promise<Object>,
  getContentTypes(query?: any): Promise<Object>,
  getEntries(query?: any): Promise<Object>,
  getEntry(id: Id, query?: any): Promise<Object>,
  getSpace(): Promise<Object>,
  getLocales(): Promise<Object>,
  parseEntries(raw: any): Promise<Object>,
  sync(query: any): Promise<Object>,
};

class ContentfulImport {
  brandId: BrandId;

  client: ContentfulClientApi;

  static mapLocale(locale: string): string {
    return locale === 'no' ? 'nb' : locale;
  }

  constructor(brandId: BrandId, apiType: 'delivery' | 'preview' = 'delivery') {
    this.brandId = brandId;
    this.client = contentful.createClient(config.contentful[brandId][apiType]);
  }

  defaultLocalizationField(data: { [string]: any }, field: string): any | string {
    // TODO: Remove hotfix when contentful's default language can be changed
    if (data[field]) {
      return ['KK', 'FK'].includes(this.brandId)
        ? data[field].fi
        : data[field][this.constructor.mapLocale(config.languages[this.brandId][0].code)];
    }
    return '';
  }

  map(data: { [string]: any }, fields: string[], localizedFields: string[]): { externalId?: any, ... } {
    const result: { [string]: any | string } = {};
    fields.forEach((field) => {
      result[field] = this.defaultLocalizationField(data, field);
    });

    localizedFields.forEach((field) => {
      config.languages[this.brandId]
        .map((l) => l.code)
        .forEach((lang) => {
          result[lang] = result[lang] || {};
          if (data[field]) {
            // $FlowFixMe[incompatible-use]
            result[lang][field] = data[field][this.constructor.mapLocale(lang)];
          } else if (field !== 'disclaimer') {
            logger.warn('Localized field not found', data, field);
          }
        });
    });
    return result;
  }

  parseMap(entries: Object[], fields: string[], localizedFields: string[]): { [key: string]: any } {
    const result: { [key: any | string]: { externalId?: any, ... } } = {};
    entries.forEach(({ sys, fields: d }) => {
      const id = this.defaultLocalizationField(d, 'id') || this.defaultLocalizationField(d, 'key');
      if (id) {
        result[id] = this.map(d, fields, localizedFields);
        result[id].externalId = sys.id;
      } else {
        logger.error('Parse content failed, invalid id', id);
      }
    });
    return result;
  }

  async getEntries(type: string): Promise<Array<any>> {
    const { items } = await this.client.getEntries({
      content_type: type,
      limit: 1000,
      locale: '*',
      order: '-sys.createdAt',
    });

    return items;
  }

  parseMailers(items: Object[]): { [key: string]: any } {
    return this.parseMap(items, ['image', 'type', 'lander'], ['subject', 'text']);
  }

  async importMailers(): Promise<any> {
    const entries = await this.getEntries('mailer');
    const mailers = this.parseMailers(entries);
    logger.info(`${Object.keys(mailers).length} mailers imported`);
    return mailers;
  }

  parseNotifications(entries: Object[]): { ... } {
    const items = this.parseMap(
      entries,
      ['priority', 'action', 'id', 'type', 'tags', 'bonus', 'important', 'openOnLogin', 'image'],
      ['title', 'content', 'actiontext', 'disclaimer'],
    );
    const notifications: { [string]: any } = {};
    Object.keys(items).forEach((k) => {
      const { bonus, tags, type, priority, ...rest } = items[k];
      const p = priority !== '' ? priority : 1000;
      notifications[k] = {
        enabled: true,
        type: type || '',
        action: '',
        image: '',
        rules: { priority: p, bonus: bonus || undefined, tags: tags.split(',') },
        ...rest,
      };
    });

    return notifications;
  }

  async importNotifications(): Promise<any> {
    const entries = await this.getEntries('notification');
    const notifications = this.parseNotifications(entries);
    logger.info(`${Object.keys(notifications).length} notifications imported`);
    return notifications;
  }

  parseMessages(entries: Object[]): { [key: string]: any } {
    return this.parseMap(entries, ['type'], ['text']);
  }

  parseLocalizations(entries: Object[]): { [key: string]: any } {
    return this.parseMap(entries, [], ['text']);
  }

  async importMessages(): Promise<any> {
    const entries = await this.getEntries('message');
    const messages = this.parseMessages(entries);
    logger.info(`${Object.keys(messages).length} messages imported`);
    return messages;
  }

  async importLocalizations(): Promise<any> {
    const entries = await this.getEntries('localization');
    const localizations = this.parseLocalizations(entries);
    logger.info(`${Object.keys(localizations).length} messages imported`);
    return localizations;
  }
}

module.exports = ContentfulImport;
