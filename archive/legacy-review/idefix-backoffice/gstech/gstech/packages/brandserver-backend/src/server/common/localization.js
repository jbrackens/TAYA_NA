/* @flow */
import type { TableRow, TableCell, List } from 'marked';
import type { LangDef } from './api';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const utils = require('./utils');
const configuration = require('./configuration');

type LocalizedFile = 'tc' | 'privacypolicy' | 'bonusterms';

const languages: Array<{
  code: string,
  longCode: string,
  name: string,
  engName: string,
  autoDetect?: boolean,
  override?: string,
  ...LangDef,
}> = configuration.languages();

const defaultLanguage = languages[0];

const markdownFile = (name: string) => path.join(__dirname, '/../../markdown/common/', name);
const localizations: { [key: string]: any } = {};
const localizedFiles: { [key: LocalizedFile]: { [key: BrandId]: { ... } } } = {
  tc: {},
  privacypolicy: {
    LD: { siteDomainName: 'LuckyDino.com', siteDomain: 'luckydino.com' },
    FK: { siteDomainName: 'HipSpin.com', siteDomain: 'hipspin.com' },
    CJ: { siteDomainName: 'CasinoJefe.com', siteDomain: 'casinojefe.com' },
    OS: { siteDomainName: 'OlaSpill.com', siteDomain: 'olaspill.com' },
    KK: { siteDomainName: 'JustWOW.com', siteDomain: 'justwow.com' },
    SN: { siteDomainName: 'FreshSpins.com', siteDomain: 'freshspins.com' },
    VB: { siteDomainName: 'Vie.bet', siteDomain: 'vie.bet' },
  },
  bonusterms: {},
};

const customRenderers: { [key: LocalizedFile]: { ... } } = {
  bonusterms: {
    list({ raw, ordered, items }: List) {
      const numberedRE = /^\d+\./;
      const romanRE = /^[ivx]+\./i;
      const content = items.map((item) => `<li>${item.text}</li>`).join('');
      const rendered =
        numberedRE.test(raw) || ordered
          ? `<ol type="1" style="list-style-type: decimal">${content}</ol>`
          : romanRE.test(raw)
            ? `<ol type="i" style="list-style-type: lower-roman">${content}</ol>`
            : `<ul>${content}</ul>`;
      return rendered;
    },
    tablerow({ text }: TableRow) {
      return `<tr style="font-style: italic;">${text}</tr>`;
    },
    tablecell({ header, text, align }: TableCell) {
      return `<${header ? 'th' : 'td'} style="padding: 0.2em 0.9em; text-align: ${
        align || 'left'
      }">${text}</${header ? 'th' : 'td'}>`;
    },
  },
  tc: {
    tablerow({ text }: TableRow) {
      return `<tr style="font-style: italic;">${text}</tr>`;
    },
    tablecell({ text, header, align }: TableCell) {
      return `<${header ? 'th' : 'td'} style="padding: 0.2em 0.9em; text-align: ${
        align || 'left'
      }">${text}</${header ? 'th' : 'td'}>`;
    },
  },
};

languages.forEach((lang) => {
  const l = configuration.requireProjectFile(`./data/locale-${lang.code}`);
  for (const [file, fileVars] of Object.entries(localizedFiles)) {
    l[`files.${file}`] = utils.populate(
      fs.readFileSync(markdownFile(`${lang.code}/${file}.md`)).toString(),
      fileVars[configuration.shortBrandId()] || {},
      'markdown',
      null,
      false,
      customRenderers[file],
    );
  }
  localizations[lang.code] = l;
});

type localizeFn = (
  lang: ?string,
  defaultValues: any,
) => (key: string, values?: any, options?: any) => ?string;

const localize: localizeFn =
  (lang, defaultValues = {}) =>
  (key, values = {}, options = {}) => {
    const l = localizations[lang || defaultLanguage.code] || localizations[defaultLanguage.code];
    const localized = l[key];
    if (localized != null && localized !== '') {
      return utils.populate(
        localized,
        _.extend({}, defaultValues, values),
        options.format,
        options,
      );
    }
    if (values === false) {
      return undefined; // return ''?
    }
    logger.error('Not localized', key, lang);
    return key;
  };

const findLanguage = (langCode: string): any => {
  const langMatch = _.find(languages, { code: langCode?.toLowerCase() });
  if (langMatch && langMatch.override) return findLanguage(langMatch.override);
  return langMatch || defaultLanguage;
};

const validLanguages = (): Array<string> => languages.map((x) => x.code);

const mapLang = (lang: { ...LangDef, ... }): { path: string, ...LangDef, ... } => ({
  ...lang,
  path: `/${lang.code}/`,
});

module.exports = {
  localize,
  languages,
  findLanguage,
  validLanguages,
  mapLang,
  defaultLanguage: (): any => defaultLanguage,
};
