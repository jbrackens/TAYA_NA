/* @flow */
/* eslint-disable no-dupe-class-members */ // TODO: address this, bubbled up from bumping eslint
import type { ApiReward } from "./rewards";
import type { RequestContext, Request, LegacyPlayer, Journey, Notification, Reward, Bonus } from '../common/api';
import type { Balance } from '../common/modules/balance/types';
import type { DinoMeterStates } from './luckydino-progress';
import type { BannerLocation } from './banners';
import type { BannerDef, BannerRules } from '../common/banners';
import type { BonusBanner } from '../common/common-journey';
import type { CampaignDef } from '../common/campaign';

const _ = require('lodash');
const moment = require('moment-timezone');
const weighted = require('weighted');
const logger = require('../common/logger');
const utils = require('../common/utils');
const dataStorage = require('../common/datastorage');
const leaderboard = require('../common/leaderboard');
const styles = require('./data/inline-styles.json');
const progress = require('./luckydino-progress');
const ldRewards = require('./rewards');
const { imageBannerTemplate, calculateDial, inlineBannerWrapper, progressMeterTemplate, campaignTemplate, bannerTemplate } = require('./banners');
const { imageSelector } = require('../common/banner-commons');
const { htmlBanner } = require('../common/banners');
const { commonTags, commonActiveNotifications, commonProperties, getBonusBanners } = require('../common/common-journey');
const { getActiveCampaigns } = require('../common/campaign');

class LuckyDinoJourney implements Journey {
  rewardsCount: number;

  promotions: { [key: string]: any };

  level: () => number;

  init: () => Promise<void>;

  activeNotifications: (context: RequestContext, type: string) => Notification[];

  activeBonuses: () => BonusBanner[];

  getReward: (id: string) => Promise<?Reward>;

  activeCampaigns: (extraTags?: string[]) => Promise<CampaignDef[]>;

  checkTags: (tags: string[]) => boolean;

  tags: string[];

  req: express$Request;

  balance: ?Balance;

  details: ?LegacyPlayer;

  bonuses: ?(Bonus[]);

  activeBonus: ?Bonus;

  meterStates: ?DinoMeterStates;

  format(
    context: RequestContext,
    content: ?string,
    html: boolean | 'markdown' = false,
  ): any | string {
    if (content != null) {
      const d = _.extend({}, utils.localizeDefaults(context), commonProperties(this.req));
      return utils.populate(content.replace(/----$/, ''), d, html);
    }
    return '';
  }

  matchRules(x: BannerRules): boolean {
    let result = true;
    if (x.tags) {
      for (const key of Array.from(x.tags)) {
        result = result && this.checkTag(key);
      }
    }
    if (x.bonus && result && this.bonuses != null) {
      result = result && _.includes(this.bonuses.map((x) => x.activeBonus) || [], x.bonus);
    }

    if (x.lastDeposit && result) {
      result = false;
    }
    return result;
  }

  constructor(
    req1: Request,
    balance: ?Balance,
    bonuses: ?(Bonus[]),
    details: ?LegacyPlayer,
    extraTags: ?(string[]),
    currentMoment: moment$Moment = moment(),
  ) {
    // $FlowFixMe[method-unbinding]
    (this: any).format = this.format.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).matchRules = this.matchRules.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).checkTag = this.checkTag.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).checkTags = this.checkTags && this.checkTags.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).activeNotifications = this.activeNotifications.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).activeBanners = this.activeBanners.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).currentBanner = this.currentBanner.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).createBanner = this.createBanner.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).banner = this.banner.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).bannerInfo = this.bannerInfo.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).returnBanner = this.returnBanner.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).updateBanners = this.updateBanners.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).allBanners = this.allBanners.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).getBannerById = this.getBannerById.bind(this);
    this.req = req1;
    this.balance = balance;
    this.bonuses = bonuses;
    this.details = details;
    const { req } = this;
    const { context } = req;
    this.tags = extraTags || [];
    commonTags(req, context, this, currentMoment);
  }

  // $FlowFixMe[duplicate-class-member]
  async init() {
    if (this.balance) {
      const currentDepositBanner = this.currentBanner('deposit');
      if (currentDepositBanner != null && currentDepositBanner.rules != null) {
        this.activeBonus = _.find(
          this.bonuses,
          (x: Bonus) => x.activeBonus === currentDepositBanner.rules.bonus,
        );
      }
      this.meterStates = await progress.getMeterStates(this);
      this.rewardsCount = this.meterStates ? this.meterStates.reward.count : 0;
      if (this.rewardsCount > 0) this.tags.push('rewards');
    }
  }

  checkTag(k: string): boolean {
    return utils.matchTags(this.tags, k);
  }

  // $FlowFixMe[duplicate-class-member]
  checkTags(tags: string[]): boolean {
    // $FlowFixMe[method-unbinding]
    return _.every(tags, this.checkTag);
  }

  // $FlowFixMe[duplicate-class-member]
  activeNotifications(context: RequestContext, type: string): Array<Notification> | Array<any> { // eslint-disable-line no-unused-vars
    // $FlowFixMe[method-unbinding]
    return commonActiveNotifications(context, this.matchRules, this.format);
  }

  activeBanners(location: BannerLocation): Array<any> {
    return _.filter<any, BannerDef>(
      dataStorage.banners(location),
      (x) => x.enabled && x.rules && this.matchRules(x.rules),
    );
  }

  currentBanner(location: BannerLocation): any | void {
    const groups = _.groupBy<BannerLocation, any>(this.activeBanners(location), (x) =>
      x.rules != null ? x.rules.priority : undefined,
    );
    const items =
      groups[
        _(groups)
          .keys()
          .sortBy((x) => Number(x))
          .first()
      ] || [];
    if (items.length > 0)
      return weighted.select(
        items,
        items.map((x) => x.weight),
      );
  }

  createCampaign(
    context: RequestContext,
    banner: BannerDef,
    location: BannerLocation,
  ): any | string {
    if (
      (banner[context.languageISO] != null ? banner[context.languageISO].title : undefined) == null
    ) {
      logger.warn('No banner for campaign, returning empty', context.languageISO, banner, location);
      return '';
    }
    const data = {
      title: this.format(
        context,
        banner[context.languageISO] != null ? banner[context.languageISO].title : undefined,
      ),
      subtitle: this.format(
        context,
        banner[context.languageISO] != null ? banner[context.languageISO].subtitle : undefined,
        location === 'deposit',
      ),
      banner: this.format(
        context,
        banner[context.languageISO] != null ? banner[context.languageISO].banner : undefined,
        location === 'deposit',
      ),
      action:
        location === 'nonloggedin'
          ? `/${context.languageISO}${banner.action || ''}`
          : banner.action,
      actiontext: banner[context.languageISO].action,
    };
    return campaignTemplate(data);
  }

  createBanner(
    context: RequestContext,
    location: BannerLocation,
    banner: ?BannerDef,
  ): any | string {
    if (banner == null) {
      logger.warn('No banner found for location', location);
      return '';
    }

    if (
      location === 'myaccount-rewards' ||
      (location === 'game' && banner.id.indexOf('dinorewards') !== -1)
    ) {
      if (this.meterStates != null) {
        const { reward } = this.meterStates;
        const { d1, d2 } = calculateDial(reward.progress);
        return progressMeterTemplate({
          d1,
          d2,
          reward,
          campaignContent:
            banner.id === 'dinorewards_leaderboard'
              ? leaderboard.create(this.req, location, banner, 3, true)
              : undefined,
          bannerId: `banner_${location}_${banner.id}`,
          title: this.format(
            context,
            banner[context.languageISO] != null ? banner[context.languageISO].title : undefined,
          ),
          subtitle: this.format(
            context,
            banner[context.languageISO] != null ? banner[context.languageISO].subtitle : undefined,
          ),
          banner: this.format(
            context,
            banner[context.languageISO] != null ? banner[context.languageISO].banner : undefined,
          ),
          action:
            location === 'nonloggedin'
              ? `/${context.languageISO}${banner.action || ''}`
              : banner.action,
          actiontext: banner[context.languageISO].action,
          promotion: this.meterStates && this.meterStates.reward,
          rewardscount: this.rewardsCount > 0 && location === 'game' ? this.rewardsCount : '',
        });
      }
      return '';
    }

    if (location === 'game') {
      if (banner.id.indexOf('long_leaderboard') !== -1) {
        return leaderboard.create(this.req, location, banner, 10);
      }

      if (banner.id.indexOf('leaderboard') !== -1) {
        return leaderboard.create(this.req, location, banner, 3);
      }

      return imageBannerTemplate({
        action: banner.action,
        bannerId: `banner_${location}_${banner.id}`,
      });
    }

    return bannerTemplate({
      bannerId: `banner_${location}_${banner.id}`,
      location,
      campaign: this.createCampaign(context, banner, location),
    });
  }

  banner(context: RequestContext, location: BannerLocation): any | void | string {
    const b = this.bannerInfo(context, location);
    if (b != null) {
      return b.banner;
    }
  }

  bannerInfo(
    context: RequestContext,
    location: BannerLocation,
  ): { active: boolean, banner: any | void | string, disclaimer: void | string } {
    return this.returnBanner(context, location, this.currentBanner(location));
  }

  returnBanner(
    context: RequestContext,
    location: BannerLocation,
    banner: ?BannerDef,
  ): { active: boolean, banner: any | void | string, disclaimer: void | string } {
    let bg;
    if (_.includes(['game', 'myaccount-rewards'], location) && banner != null) {
      if (banner.image != null && banner.image !== '') {
        bg = utils.populate(banner.image, { lang: context.languageISO });
      }
    }

    const namespace = 'banners/sidebar/';
    const ret = {
      active: banner != null,
      banner: (() => {
        if (banner != null) {
          const bannerId = `banner_${location}_${banner.id}`;
          if (banner.type && banner.type !== 'internal') {
            return htmlBanner(context, location, banner);
          }

          if (location === 'frontpage' || location === 'nonloggedin') {
            return inlineBannerWrapper(location, banner.id, {
              content:
                this.createBanner(context, location, banner) +
                imageSelector(bannerId, namespace, bg),
              location,
            });
          }

          return inlineBannerWrapper(location, banner.id, {
            content:
              this.createBanner(context, location, banner) + imageSelector(bannerId, namespace, bg),
            location,
          });
        }
      })(),
      disclaimer:
        (banner != null && banner[context.languageISO] && banner[context.languageISO].disclaimer) ||
        undefined,
    };
    return ret;
  }

  updateBanners(
    context: RequestContext,
    locations: BannerLocation[] = ['game', 'frontpage'],
  ): {
    [BannerLocation]: {
      active: boolean,
      banner: any | void | string,
      disclaimer: void | string,
    },
  } {
    const result: { [BannerLocation]: {
      active: boolean,
      banner: any | void | string,
      disclaimer: void | string,
    } } = {};
    for (const location of Array.from(locations)) {
      result[location] = this.bannerInfo(context, location);
    }
    return result;
  }

  allBanners(context: RequestContext, location: BannerLocation): any {
    return dataStorage
      .banners(location)
      .filter((x) => styles[x.id] != null)
      .map((banner) => this.returnBanner(context, location, banner).banner);
  }

  getBannerById(context: RequestContext, location: BannerLocation, id: string): any {
    return dataStorage
      .banners(location)
      .filter((b) => b.id === id)
      .map((banner) => this.returnBanner(context, location, banner).banner);
  }

  rewards(): Promise<Array<ApiReward>> {
    return ldRewards.getRewards(this);
  }

  // $FlowFixMe[duplicate-class-member]
  getReward(id: string): Promise<?Reward> {
    return ldRewards.rewardById(this.req.user, id);
  }

  // $FlowFixMe[duplicate-class-member]
  activeBonuses(): Array<BonusBanner> {
    return getBonusBanners(this, this.activeBanners('deposit'));
  }

  // $FlowFixMe[duplicate-class-member]
  activeCampaigns(extraTags?: string[]): Promise<Array<CampaignDef>> {
    return getActiveCampaigns(this, extraTags);
  }
}

module.exports = { Journey: LuckyDinoJourney };
