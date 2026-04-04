/* @flow */
const _ = require('lodash');
const sheets = require('gstech-core/modules/sheets');
const configuration = require('../configuration');
const config = require('../config');
const languages = require('../localization').languages.map(x => x.code);

const currencies = configuration.requireProjectFile('data/currencies.json');
const utils = require('../utils');

const missingTranslations = (key: any, lang: any) => console.log('Missing translation', key, lang); // eslint-disable-line no-console

const clean = (t: string) => t.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

const currencyVariables = {
  jefe: 'JefeCurrencyVariables',
  kalevala: 'KalevalaCurrencyVariables',
  olaspill: 'OlaspillCurrencyVariables',
  fiksu: 'FiksuCurrencyVariables',
  sportnation: 'SportnationCurrencyVariables',
  vie: 'VieCurrencyVariables',
}[configuration.project()] || 'CurrencyVariables';

module.exports = async (exportData: (id: string, data: any) => Promise<any>): Promise<Array<any | Promise<any>> | any> =>
  sheets.openSheets(configuration.sheets().localizations, ['Localizations', currencyVariables], config.google.api).then(([rows, vars]) => {
    const res = [];

    const currencyVars: { [key: string]: any } = {};
    for (const currency of Array.from(vars)) {
      for (const rowName of Array.from(_.map<any, string>(currencies, 'CurrencyISO'))) {
        currencyVars[rowName] = currencyVars[rowName] || {};
        currencyVars[rowName][currency.key] = parseInt(currency[rowName.toLowerCase()]);
      }
    }

    const clientData: { [string]: any } = {};
    const translations = (lang: string) => {
      const results: { [string]: string } = {};
      rows.forEach(row => {
        const key = clean(row.key);
        const site = clean(row.site);
        if (key && ((!results[key] && !site) || _.includes(site.split(',').map(x => x.trim()), configuration.project()))) {
          results[key] = clean(row[lang].replace(/^'/, ''));
          if (!results[key]) {
            missingTranslations(key, lang);
          }
        }
      });

      res.push(exportData(`locale-${lang}`, results));

      for (const currency of Array.from(_.map<any, string>(currencies, 'CurrencyISO'))) {
        const context: any = {
          languageISO: lang,
          currencyISO: currency,
        };

        clientData[lang] = clientData[lang] || {};
        clientData[lang][currency] = clientData[lang][currency] || {};

        const clientResults = clientData[lang][currency];

        rows.forEach(row => {
          const key = clean(row.key);
          const site = clean(row.site);
          if (row.server !== 'TRUE' && key && ((!clientResults[key] && !site) || _.includes(site.split(',').map(x => x.trim()), configuration.project()))) {
            const value = clean(row[lang].replace(/^'/, ''));
            clientResults[key] = utils.populate(value, utils.localizeDefaults(context), row.format || false, {}, true);
          }
        });
      }
    };

    languages.forEach(lang => translations(lang));
    res.push(exportData('currency-vars', currencyVars));
    res.push(exportData('client', clientData));
    return Promise.all(_.flatten<any, any>(res));
  });
