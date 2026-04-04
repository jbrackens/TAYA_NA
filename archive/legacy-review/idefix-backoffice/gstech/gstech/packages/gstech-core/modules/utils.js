/* @flow */
import type {
  SMSActionsConfigurations,
  SMSProvidersBaseConfigs,
  SMSProvidersConfigItem,
  CommChannelMethodBase,
  CommChannelConfig,
  ParsedCommChannelConfig,
  CommChannelMethod
} from './types/config';
import type { SMSAction, SMSProvider } from './constants';

const _ = require('lodash');
const chrono = require('chrono-node');
const { DateTime } = require('luxon');
const { types } = require('pg');
const hstore = require('pg-hstore')();
const logger = require('./logger');
const { brandDefinitions } = require('./constants');

const guard = function identity<T = any, K = any>(
  value: T,
  transform: (value: T) => K,
  defaultValue: K,
): K {
  try {
    return transform(value);
  } catch (e) {
    return defaultValue;
  }
};

const hstoreFromArray = (array: string[]): string =>
  hstore.stringify(array.reduce((acc, curr) => ({ ...acc, [curr]: '' }), {}));

const setTypeParser = (oid: number, parseFn: (value: string) => any): void =>
  types.setTypeParser(oid, parseFn);

// eslint-disable-next-line no-promise-executor-return
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const asyncForEach = async <T>(array: Array<T>, callback: (T) => Promise<any>): Promise<any[]> => {
  const results = [];
  // eslint-disable-next-line no-plusplus
  for (let index = 0; index < array.length; index++) results.push(await callback(array[index]));
  return results;
};

const isTestEmail = (email: string): boolean =>
  _.some(
    brandDefinitions,
    ({ name, site }) =>
      email.toLowerCase().endsWith(`@${name.toLowerCase()}.com`) ||
      email.toLowerCase().endsWith(`@${site.toLowerCase()}.com`),
  );

const resolveSmsConfigSet = <T: SMSProvider>(
  { actions, defaults, ...commonConf }: SMSActionsConfigurations<T>,
  { brandId = 'general', action }: { brandId?: BrandId | 'general', action?: SMSAction } = {},
): {
  ...SMSProvidersBaseConfigs[T],
  ...SMSProvidersConfigItem[T],
} => {
  const actionConf = action ? _.get(actions, action, {}) : {};
  const bid = _.has(actionConf, brandId) || _.has(defaults, brandId) ? brandId : 'general';
  return {
    ...commonConf,
    ...(defaults[bid] || {}),
    ...(_.get(actions, action, defaults)[bid] || {}),
  };
};

const parseDateTimeQuery = (
  query: string,
  reference?: Date,
): { from?: Date, to?: Date, text?: string } => {
  const ref = reference || new Date();
  const parser = chrono.casual.clone();
  parser.refiners.push({
    refine: ({ option }, results) => {
      const refDT = DateTime.fromJSDate(ref);
      if (results.length === 0) return results;
      const { start, end } = _.first(results);
      const startHasTime = start.isCertain('hour') || start.isCertain('minute');
      const certainComps = start.getCertainComponents();
      const startDT = DateTime.fromJSDate(start.date());
      if (+startDT > +refDT) {
        const delta: DurationFromObjectOptions = {};
        if (start.isOnlyTime()) delta.days = 1;
        else if (start.isOnlyWeekdayComponent()) delta.weeks = 1;
        else if (start.isOnlyDate() && start.get('month') === refDT.month) delta.months = 1;
        else delta.years = 1;
        return parser.parse(query, option, startDT.minus(delta).toJSDate());
      }
      const newResults = _.cloneDeep(results);
      if (!startHasTime && (start.isOnlyWeekdayComponent() || start.isOnlyDate()))
        if (!_.isEmpty(certainComps))
          newResults[0].start = { date: () => startDT.startOf('day').toJSDate() };
        else if (startDT.plus({ day: 1 }).weekNumber === refDT.weekNumber)
          newResults[0].start = { date: () => refDT.startOf('week').toJSDate() };
        else if (startDT.plus({ day: 1 }).weekNumber < refDT.weekNumber)
          newResults[0].start = { date: () => startDT.startOf('week').toJSDate() };
      if (!end)
        if (start.isOnlyWeekdayComponent() || start.isOnlyDate())
          if (_.isEmpty(certainComps) && startDT.plus({ day: 1 }).weekNumber < refDT.weekNumber)
            newResults[0].end = { date: () => startDT.endOf('week').toJSDate() };
          else if (certainComps.length === 1 && certainComps[0] === 'month')
            newResults[0].end = { date: () => startDT.endOf('month').toJSDate() };
          else if (certainComps.length === 2 && _.intersection(certainComps, ['month', 'year']).length === 2)
            newResults[0].end = { date: () => _.min([startDT.endOf('month').toJSDate(), ref]) };
          else if (_.intersection(certainComps, ['day', 'weekday']).length)
            newResults[0].end = { date: () => startDT.endOf('day').toJSDate() };
          else newResults[0].end = { date: () => DateTime.fromJSDate(ref).toJSDate() };
        else newResults[0].end = { date: () => DateTime.fromJSDate(ref).toJSDate() };
        else if (!end.isCertain('day') && end.isOnlyDate() && end.isCertain('month'))
          newResults[0].end.date = () => DateTime.fromJSDate(end.date()).endOf('month').toJSDate();
        else if (!end.isCertain('day') && end.isOnlyDate() && end.isCertain('year'))
          newResults[0].end.date = () => DateTime.fromJSDate(end.date()).endOf('year').toJSDate();
        else if (!end.isCertain('hour'))
          newResults[0].end.date = () => DateTime.fromJSDate(end.date()).endOf('day').toJSDate();
      return newResults;
    },
  });
  try {
    const parsed = _.first(parser.parse(query, ref));
    if (!parsed) return { text: query };
    const text = query.replace(parsed.text, '').trim().replaceAll(/^from/g, '').trim();
    return { from: parsed.start?.date(), to: parsed.end?.date(), ...(text ? { text } : {}) };
  } catch (err) {
    logger.warn('!!! parseDateTimeQuery [FAILED]', { query, reference, err });
    return { text: query };
  }
};

const isBaseChannelMethod = (m: string): m is CommChannelMethodBase => m === 'email' || m === 'sms';

const parseCommChannelConfig = (channelConfig: CommChannelConfig, req?: express$Request): ParsedCommChannelConfig => {
  const parseMethod = (m: CommChannelMethod): ParsedCommChannelConfig => {
    const [primary, fallback] = m.split('>')
    if (isBaseChannelMethod(primary))
      if (isBaseChannelMethod(fallback)) return { primary, fallback };
      else return { primary };
    throw new Error(`Invalid communication channel method "${m}"`)
  }
  if (typeof channelConfig === 'string') return parseMethod(channelConfig);
  if (!req) return parseMethod(channelConfig.default);
  const { country } = req.context;
  const { CountryISO } = country;
  const countryChannelConfig = channelConfig.countries && channelConfig.countries[CountryISO];
  if (countryChannelConfig) return parseMethod(countryChannelConfig);
  return parseMethod(channelConfig.default);
}


module.exports = {
  guard,
  hstoreFromArray,
  setTypeParser,
  sleep,
  asyncForEach,
  isTestEmail,
  resolveSmsConfigSet,
  parseDateTimeQuery,
  parseCommChannelConfig,
};
