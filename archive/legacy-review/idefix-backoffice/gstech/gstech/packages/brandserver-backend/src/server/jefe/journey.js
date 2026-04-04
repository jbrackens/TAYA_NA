/* @flow */
/* eslint-disable no-dupe-class-members */ // TODO: address this, bubbled up from bumping eslint
import type {
  RequestContext,
  Request,
  LegacyPlayer,
  Journey,
  Notification,
  Reward,
  Bonus,
} from '../common/api';
import type { Balance } from '../common/modules/balance/types';
import type { JefeMeterStates } from './jefe-progress';
import type { BannerLocation } from './banners';
import type { BannerDef, BannerRules } from '../common/banners';
import type { BonusBanner } from '../common/common-journey';
import type { CampaignDef } from '../common/campaign';

const _ = require('lodash');
const moment = require('moment-timezone');
const weighted = require('weighted');
const configuration = require('./configuration');
const logger = require('../common/logger');
const utils = require('../common/utils');
const dataStorage = require('../common/datastorage');
const localization = require('../common/localization');
const progress = require('./jefe-progress');
const bountiesR = require('./bounties');
const {
  commonTags,
  commonActiveNotifications,
  commonProperties,
  getBonusBanners,
} = require('../common/common-journey');
const { sidebarBanner, bountyBanner, mainBanner, campaignBanner } = require('./banners');
const { getActiveCampaigns } = require('../common/campaign');
const leaderboard = require('../common/leaderboard');
const { imageSelector } = require('../common/banner-commons');

class JefeJourney implements Journey {
  balance: ?Balance;

  bountiesCount: number;

  bannerBounty: {
    gameid: string,
    game: string,
    spins: ?number,
  };

  level: () => number;

  init: () => Promise<void>;

  getReward: (id: string) => Promise<?Reward>;

  activeNotifications: (context: RequestContext, type: string) => Notification[];

  activeBonuses: () => BonusBanner[];

  activeCampaigns: (extraTags?: string[]) => Promise<CampaignDef[]>;

  checkTags: (tags: string[]) => boolean;

  tags: string[];

  req: express$Request;

  details: ?LegacyPlayer;

  bonuses: ?(Bonus[]);

  activeBonus: ?Bonus;

  meterStates: ?JefeMeterStates;

  format(
    context: RequestContext,
    content: ?string,
    html: boolean | 'markdown' = false,
  ): any | string {
    if (content != null) {
      const d = _.extend(
        {},
        this.bannerBounty,
        utils.localizeDefaults(context),
        commonProperties(this.req),
      );
      return utils.populate(content, d, html);
    }
    return '';
  }

  matchRules(x: BannerRules): boolean {
    let result = true;
    if (x && x.tags) {
      for (const key of Array.from(x.tags)) {
        result = result && this.checkTag(key);
      }
    }
    if (x && x.bonus && result && this.bonuses != null) {
      result =
        result &&
        _.includes(
          (this.bonuses != null ? this.bonuses.map((x) => x.activeBonus) : undefined) || [],
          x.bonus,
        );
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
    (this: any).checkTags = this.checkTags.bind(this);
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
      this.bountiesCount = this.meterStates ? this.meterStates.bounty.count : 0;
      if (this.bountiesCount > 0) {
        this.tags.push(`bounty`);
      }
      const spins = this.meterStates ? this.meterStates.wheel.count : 0;
      if (spins > 0) {
        this.tags.push('spin');
      }
      this.tags.push(`level-${this.balance?.VIPLevel || 1}`);
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

  createCampaign(context: RequestContext, banner: BannerDef, location: BannerLocation): string {
    if (
      location !== 'deposit' &&
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
      bannerId: `banner_${location}_${banner.source || banner.id}`,
      level: this.balance?.VIPLevel,
      currency: context.currencyISO.toLowerCase(),
      language: context.languageISO.toLowerCase(),
    };
    return campaignBanner(location, banner, data);
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
      _.includes(
        [
          'game-level',
          'game-bounty',
          'game-wheel',
          'myjefe-level',
          'myjefe-bounty',
          'myjefe-wheel',
        ],
        location,
      )
    ) {
      if (banner.id.indexOf('leaderboard') !== -1) {
        const bannerId = `banner_${location}_${banner.source || banner.id}`;
        const namespace = 'images/sidebar/';

        const css =
          banner.image != null && banner.image !== ''
            ? imageSelector(
                `${bannerId}.image`,
                namespace,
                utils.populate(banner.image || '', { lang: context.languageISO }),
              )
            : '';

        return (
          sidebarBanner(location, banner, {
            bannerId,
            level: this.balance?.VIPLevel,
            banner: leaderboard.create(this.req, location, banner, 10),
            currency: context.currencyISO.toLowerCase(),
            title: '',
            subtitle: '',
            action:
              location === 'nonloggedin'
                ? `/${context.languageISO}${banner.action || ''}`
                : banner.action,
            actiontext: banner[context.languageISO].action,
            promotion: null,
          }) + css
        );
      }

      return sidebarBanner(location, banner, {
        bannerId: `banner_${location}_${banner.source || banner.id}`,
        level: this.balance?.VIPLevel,
        title: this.format(
          context,
          banner[context.languageISO] != null ? banner[context.languageISO].title : undefined,
          'markdown',
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
        currency: context.currencyISO.toLowerCase(),
        target: (() => {
          if (location === 'game-level' || location === 'myjefe-level') {
            return localization.localize(context.languageISO)('meter.target.level', {
              level: (this.balance?.VIPLevel || 1) + 1,
            });
          }
          if (location === 'game-bounty' || location === 'myjefe-bounty') {
            return localization.localize(context.languageISO)('meter.target.bounty');
          }
          if (location === 'game-wheel' || location === 'myjefe-wheel') {
            return localization.localize(context.languageISO)('meter.target.spin');
          }
        })(),
        promotion: (() => {
          if (this.meterStates != null) {
            if (location === 'game-level' || location === 'myjefe-level') {
              return this.meterStates.level;
            }

            if (location === 'game-bounty' || location === 'myjefe-bounty') {
              return this.meterStates.bounty;
            }

            if (location === 'game-wheel' || location === 'myjefe-wheel') {
              return this.meterStates.wheel;
            }
          }
        })(),
      });
    }

    if (location === 'frontpage' && this.bannerBounty != null && banner.id === 'bounty') {
      const imagePath = `banners/loggedin_small/bounties/${this.bannerBounty.gameid}.png`;
      const imagePath2x = `banners/loggedin_small/bounties/${this.bannerBounty.gameid}@2x.png`;
      return bountyBanner(banner, {
        bannerId: `banner_${location}_${banner.source || banner.id}`,
        campaign: this.createCampaign(context, banner, location),
        level: this.balance?.VIPLevel,
        currency: context.currencyISO.toLowerCase(),
        language: context.languageISO.toLowerCase(),
        style: `
#banner_${location}_${banner.source || banner.id} .campaign:after {
  background-image: url(${configuration.cdn(imagePath)});
  background-size: 130px 130px;
}
@media only screen and (min-width:550px) and (min--moz-device-pixel-ratio:1.5),
       only screen and (min-width:550px) and (min-device-pixel-ratio:1.5),
      only screen and (min-width:550px) and (-webkit-min-device-pixel-ratio:1.4375),
      only screen and (min-width:550px) and (min-resolution:138dpi),
      only screen and (min-width:550px) and (-webkit-min-device-pixel-ratio:1.5),
      only screen and (min-width:550px) and (min-resolution:1.5dppx) {

  #banner_${location}_${
          banner.source || banner.id
        } .campaign:after { background-image: url(${configuration.cdn(imagePath2x)}); }
}`,
      });
    }
    return mainBanner(context, location, banner, {
      bannerId: `banner_${location}_${banner.source || banner.id}`,
      campaign: this.createCampaign(context, banner, location),
      level: this.balance?.VIPLevel,
      currency: context.currencyISO.toLowerCase(),
      language: context.languageISO.toLowerCase(),
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
  ): { active: boolean, banner: ?string, disclaimer: ?string } {
    const banner = this.currentBanner(location);
    return {
      active: banner != null,
      banner: banner != null ? this.createBanner(context, location, banner) : undefined,
      disclaimer:
        (banner != null && banner[context.languageISO] && banner[context.languageISO].disclaimer) ||
        undefined,
    };
  }

  updateBanners(
    context: RequestContext,
    locations: BannerLocation[] = ['frontpage'],
  ): {
    [BannerLocation]: {
      active: boolean,
      banner: any | void | string,
      disclaimer: ?string,
    },
  } {
    const result: {
      [BannerLocation]: {
        active: boolean,
        banner: any | void | string,
        disclaimer: ?string,
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
      .map((banner) => this.createBanner(context, location, banner));
  }

  bounties(): Promise<
    {
      type: string,
      id: string | Id,
      bountyid: string,
      bounty_image: string,
      action: string,
    }[]> {
    return bountiesR.bounties(this);
  }

  wheel(): Promise<number> {
    return bountiesR.wheel(this);
  }

  // $FlowFixMe[duplicate-class-member]
  getReward(id: string): Promise<?{ ...Reward, ... }> {
    return bountiesR.getApiBounty(this.req, id);
  }

  // $FlowFixMe[duplicate-class-member]
  activeBonuses(): Array<BonusBanner> {
    return getBonusBanners(this, this.activeBanners('deposit'));
  }

  // $FlowFixMe[duplicate-class-member]
  level(): number {
    return this.balance?.VIPLevel || 1;
  }

  // $FlowFixMe[duplicate-class-member]
  activeCampaigns(extraTags?: string[]): Promise<Array<CampaignDef>> {
    return getActiveCampaigns(this, extraTags);
  }
}

module.exports = { Journey: JefeJourney };
