/* @flow */
/* eslint-disable no-dupe-class-members */ // TODO: address this, bubbled up from bumping eslint
import type { CasinoCurrency } from 'gstech-core/modules/types/rewards';
import type {ShopItem, CoinBalance} from "../common/common-responders";
import type { RequestContext, Request, LegacyPlayer, Journey, Notification, Reward, Bonus } from '../common/api';
import type { Balance } from '../common/modules/balance/types';
import type { ShopV1MeterStates } from '../kalevala/kalevala-progress';
import type { BannerLocation } from './shared-banners';
import type { BannerDef, BannerRules } from '../common/banners';
import type { BonusBanner } from '../common/common-journey';
import type { CampaignDef } from '../common/campaign';

const _ = require('lodash');
const moment = require('moment-timezone');
const weighted = require('weighted');
const logger = require('../common/logger');
const utils = require('../common/utils');
const dataStorage = require('../common/datastorage');
const progress = require('./olaspill-progress');
const { commonTags, commonActiveNotifications, commonProperties, getBonusBanners } = require('../common/common-journey');
const leaderboard = require('../common/leaderboard');
const localization = require('../common/localization');
const { bannerTemplate, meterBannerTemplate } = require('./banners');
const { inlineBannerWrapper, leaderboardBannerTemplate, campaignTemplate } = require('./shared-banners');
const { imageSelector } = require('../common/banner-commons');
const { getActiveCampaigns } = require('../common/campaign');

class OlaspillJourney implements Journey {
  balance: ?Balance;

  level: () => number;

  init: () => Promise<void>;

  activeNotifications: (context: RequestContext, type: string) => Notification[];

  getReward: (id: string) => Promise<?Reward>;

  activeBonuses: () => BonusBanner[];

  activeCampaigns: () => Promise<CampaignDef[]>;

  checkTags: (tags: string[]) => boolean;

  tags: string[];

  req: express$Request;

  details: ?LegacyPlayer;

  bonuses: ?(Bonus[]);

  activeBonus: string[];

  meterStates: ShopV1MeterStates;

  format(
    context: RequestContext,
    content: ?string,
    html: true | false | 'markdown' = false,
  ): any | string {
    if (content != null) {
      const d = _.extend({}, utils.localizeDefaults(context), commonProperties(this.req));
      return utils.populate(content, d, html);
    }
    return '';
  }

  checkTag(k: string): boolean {
    return utils.matchTags(this.tags, k);
  }

  // $FlowFixMe[duplicate-class-member]
  checkTags(tags: string[]): boolean {
    // $FlowFixMe[method-unbinding]
    return _.every(tags, this.checkTag);
  }

  matchRules(x: BannerRules): boolean {
    let result = true;
    if (x.tags) {
      for (const key of Array.from(x.tags)) {
        result = result && this.checkTag(key);
      }
    }
    if (x.bonus && result) {
      result = result && _.includes(this.activeBonus, x.bonus);
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
    (this: any).checkTag = this.checkTag.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).checkTags = this.checkTags.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).matchRules = this.matchRules.bind(this);
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
    // $FlowFixMe[method-unbinding]
    (this: any).shopItems = this.shopItems.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).coinBalance = this.coinBalance.bind(this);

    this.req = req1;
    this.balance = balance;
    this.bonuses = bonuses;
    this.details = details;

    const { req } = this;
    const { context } = req;

    this.tags = extraTags || [];
    commonTags(req, context, this, currentMoment);
    this.meterStates = {
      coins: null,
    };
  }

  // $FlowFixMe[duplicate-class-member]
  async init() {
    const { balance, bonuses } = this;
    if (balance != null) {
      this.activeBonus = bonuses != null ? bonuses.map((x) => x.activeBonus) : [];
      this.meterStates = await progress.getMeterStates(this);
    }
  }

  // $FlowFixMe[duplicate-class-member]
  activeNotifications(context: RequestContext, type: string): Array<Notification> | Array<any> {
    // $FlowFixMe[method-unbinding]
    return commonActiveNotifications(context, this.matchRules, this.format, type);
  }

  activeBanners(location: BannerLocation): Array<any> {
    return _.filter<any, any>(
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
    if (items.length > 0) {
      return weighted.select(
        items,
        items.map((x) => x.weight),
      );
    }
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
        'markdown',
      ),
      action:
        location === 'nonloggedin'
          ? `/${context.languageISO}${banner.action || ''}`
          : banner.action,
      actiontext: banner[context.languageISO].action,
    };
    return campaignTemplate(data);
  }

  createBanner(context: RequestContext, location: BannerLocation, banner: BannerDef): any | string {
    if (banner == null) {
      logger.warn('No banner found for location', location);
      return '';
    }
    const bannerId = `banner_${location}_${banner.id}`;

    if (location === 'game' || location === 'myaccount-shop') {
      return meterBannerTemplate({
        action: banner.action,
        bannerId,
        promotion: this.meterStates.coins,
        title: this.format(
          context,
          banner[context.languageISO] != null ? banner[context.languageISO].title : undefined,
          'markdown',
        )
          .replace(/^<p/, `<h1 id=\"banner_${location}_${banner.id}__title\"`)
          .trim()
          .replace(/<\/p>$/g, '</h1>'),
        subtitle: this.format(
          context,
          banner[context.languageISO] != null ? banner[context.languageISO].subtitle : undefined,
          'markdown',
        ).replace(/^<p/, `<p id=\"banner_${location}_${banner.id}__subtitle\"`),
        banner: this.format(
          context,
          banner[context.languageISO] != null ? banner[context.languageISO].banner : undefined,
          'markdown',
        ).replace(/^<p/, `<p id=\"banner_${location}_${banner.id}__banner\"`),
        actiontext: banner[context.languageISO].action,
        type: this.meterStates.coins != null ? this.meterStates.coins.type : undefined,
        coins: this.meterStates.coins != null ? this.meterStates.coins.coins : undefined,
      });
    }

    if (location === 'game-leaderboard') {
      return leaderboardBannerTemplate({
        headertext: localization.localize(context.languageISO)('leaderboard.header'),
        action: banner.action,
        bannerId,
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
          'markdown',
        ).replace(/^<p/, `<p id=\"banner_${location}_${banner.id}__banner\"`),
        actiontext: banner[context.languageISO].action,
        leaderboard: leaderboard.create(this.req, location, banner, 10, true),
      });
    }

    return bannerTemplate({
      location,
      bannerId,
      campaign: this.createCampaign(context, banner, location),
    });
  }

  banner(context: RequestContext, location: BannerLocation): ?string {
    const b = this.bannerInfo(context, location);
    if (b != null) {
      return b.banner;
    }
  }

  bannerInfo(
    context: RequestContext,
    location: BannerLocation,
  ): {
    active: boolean,
    banner: ?string,
    disclaimer?: string,
    options?: { show: boolean },
    progress?: ?{
      coins: number,
      completed: boolean,
      progress: number,
      type: CasinoCurrency,
      ...
    },
  } {
    return this.returnBanner(context, location, this.currentBanner(location));
  }

  returnBanner(
    context: RequestContext,
    location: BannerLocation,
    banner: ?BannerDef,
  ): {
    active: boolean,
    banner: ?string,
    disclaimer?: string,
    options?: { show: boolean },
    progress?: ?{
      coins: number,
      completed: boolean,
      progress: number,
      type: CasinoCurrency,
      ...
    },
  } {
    if (banner == null) {
      return { active: false, options: { show: false }, banner: null };
    }

    const bannerId = `banner_${location}_${banner.id}`;
    const namespace = 'images/banners/sidebar/';

    const css =
      (location === 'game' || location === 'game-leaderboard') &&
      banner != null &&
      banner.image != null &&
      banner.image !== ''
        ? imageSelector(
            bannerId,
            namespace,
            utils.populate(banner.image || '', { lang: context.languageISO }),
          )
        : '';

    return {
      active: true,
      banner:
        inlineBannerWrapper(banner.id, {
          content: this.createBanner(context, location, banner),
          location,
        }) + css,
      disclaimer:
        (banner[context.languageISO] && banner[context.languageISO].disclaimer) || undefined,
      progress: this.meterStates.coins,
    };
  }

  updateBanners(context: RequestContext, locations: BannerLocation[] = ['frontpage']): { ... } {
    const result: {
      [BannerLocation]: {
        active: boolean,
        banner: ?string,
        disclaimer?: string,
        options?: { show: boolean },
        progress?: ?{
          coins: number,
          completed: boolean,
          progress: number,
          type: CasinoCurrency,
          ...
        },
      },
    } = {};
    for (const location of Array.from(locations)) {
      result[location] = this.bannerInfo(context, location);
    }
    return result;
  }

  allBanners(context: RequestContext, location: BannerLocation): any {
    return dataStorage
      .banners(location)
      .map((banner) => this.createBanner(context, location, banner));
  }

  getBannerById(context: RequestContext, location: BannerLocation, id: string): any {
    return dataStorage
      .banners(location)
      .filter((b) => b.id === id)
      .map((banner) => this.returnBanner(context, location, banner).banner);
  }

  shopItems(): Promise<Array<ShopItem>> {
    return progress.shopItems(this);
  }

  // $FlowFixMe[duplicate-class-member]
  getReward(id: string): Promise<?{...Reward, ...}> {
    return progress.getShopItem(id);
  }

  coinBalance(): Promise<CoinBalance> {
    return progress.coinBalance(this);
  }

  // $FlowFixMe[duplicate-class-member]
  activeBonuses(): Array<BonusBanner> {
    return getBonusBanners(this, this.activeBanners('deposit'));
  }

  // $FlowFixMe[duplicate-class-member]
  activeCampaigns(): Promise<Array<CampaignDef>> {
    return getActiveCampaigns(this);
  }
}

module.exports = { Journey: OlaspillJourney };
