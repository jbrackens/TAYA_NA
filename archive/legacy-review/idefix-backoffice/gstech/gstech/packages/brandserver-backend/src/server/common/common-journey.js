/* @flow */
import type { RequestContext, Journey, Bonus } from './api';
import type { BannerRules, BannerDef } from './banners';

const { isTestEmail } = require('gstech-core/modules/utils');

const moment = require('moment-timezone');
const _ = require('lodash');
const { BalanceInfo } = require('./balance-info');
const configuration = require('./configuration');
const utils = require('./utils');
const dataStorage = require('./datastorage');
const localization = require('./localization');

const commonActiveNotifications = (context: RequestContext, matchRules: (rules: BannerRules) => boolean, format: (RequestContext, data: string) => string, type: string = ''): Array<any> => {
  const selectedNotifications = dataStorage.notifications().filter(x => x.type === type && x.enabled && matchRules(x.rules));
  const sorted: any[] = _.sortBy(selectedNotifications, x => (x.rules != null ? x.rules.priority : 1000));
  // $FlowFixMe[missing-type-arg]
  return sorted.map<any>(x => {
    let languageData = x[context.languageISO || localization.defaultLanguage()];
    if (languageData != null && languageData.title != null && languageData.content != null) {
      return { ...languageData, content: format(context, languageData != null ? languageData.content : ''), ...x };
    }
    languageData = x[localization.defaultLanguage()];
    return { ...languageData, content: format(context, languageData != null ? languageData.content : ''), ...x };
  });
};

// eslint-disable-next-line no-unused-vars
const commonTags = (req: express$Request, context: RequestContext, journey: Journey, currentMoment: moment$Moment = moment()) => {
  const currentDate = moment()
    .tz('Europe/Rome')
    .format('YYYYMMDD');
  const { tags } = journey;

  if (context.mobile) {
    tags.push('mobile');
  }
  if (context.country != null && context.country.CountryISO != null) {
    tags.push(`country-${context.country.CountryISO.toLowerCase()}`);
  }
  if (context.countryISO != null) {
    tags.push(`country-${context.countryISO.toLowerCase()}`);
    tags.push(`usercountry-${context.countryISO.toLowerCase()}`);
  }

  if (!context.mobile) {
    tags.push('desktop');
  }
  tags.push(`date-${currentDate}`);

  if (!configuration.productionMode()) {
    tags.push('staging');
  }

  if (req != null && req.user != null) {
    if (req.user.details.RegistrationSource != null) {
      tags.push(`lander-${req.user.details.RegistrationSource}`);
    }

    for (const flag of Array.from(req.user.details.Tags || [])) {
      tags.push(flag);
    }

    if (!req.user.details.Activated) {
      tags.push('no_activation');
    } else {
      tags.push('activated');
    }
  }

  const { details } = journey;
  if (details != null) {
    tags.push('loggedin');
    if (details.EmailAddress && isTestEmail(details.EmailAddress)) {
      tags.push('darklaunch');
    }
    if (details.IsKYCChecked !== 'true') {
      tags.push('no_kyc');
      if (details.DDFlagged) {
        tags.push('dd_flagged');
      }
      if (details.DDLocked) {
        tags.push('dd_flagged');
        tags.push('dd_locked');
      }
    }
  }

  if (!configuration.productionMode()) {
    tags.push('darklaunch');
  }
  const { balance } = journey;

  if (balance != null) {
    if (parseInt(balance.NumDeposits) > 0) {
      tags.push('deposits');
    }
    tags.push(`deposits-${balance.NumDeposits}`);

    if (parseInt(balance.CurrentBonusBalance) === 0 && parseInt(balance.CurrentRealBalance) > 0) {
      tags.push('realmoney');
    }

    if (new BalanceInfo(balance).isDepleted()) {
      tags.push('depleted');
    }
    if (new BalanceInfo(balance).hasActiveBonusMoney()) {
      tags.push('usingbonusmoney');
    }
  }
};

const commonProperties = (req: express$Request): {dd_duedate: any | string, email: any | string, name: any | string} => ({
  email: req.user != null ? req.user.email : '',
  dd_duedate: req.user != null && req.user.details.DDRequireDate ? utils.formatDate(req, req.user.details.DDRequireDate) : '',
  name: req.user != null ? req.user.details.FirstName : '',
});

export type BonusBanner = {
  bonus: ?Bonus,
  banner: BannerDef,
  wageringRequirement: number,
};

const getBonusBanners = (journey: Journey, banners: BannerDef[]): BonusBanner[] => {
  const result = [];
  banners.forEach((banner) => {
    const bonus = _.find(journey.bonuses, (bonus: Bonus) => banner.rules && banner.rules.bonus === bonus.activeBonus);
    if (bonus || (banner.rules && banner.rules.bonus == null)) {
      result.push({ banner, bonus, wageringRequirement: (bonus && bonus.wageringRequirement) || banner.wageringRequirement });
    }
  });
  return _.sortBy(result, x => (x.banner && x.banner.rules != null ? x.banner.rules.priority : 1000));
};

module.exports = { commonTags, commonActiveNotifications, commonProperties, getBonusBanners };
