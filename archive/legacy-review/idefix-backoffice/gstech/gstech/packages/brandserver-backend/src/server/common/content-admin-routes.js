/* @flow */

import type { BannerDef } from './banners';

const _ = require('lodash');
const { Journey } = require('./journey');
const configuration = require('./configuration');
const utils = require('./utils');
const datastorage = require('./datastorage');
const fullLanguages = require('./localization').languages;

const languages = fullLanguages.map(({ code }) => code);
const currencyVars = configuration.requireProjectFile('./data/currency-vars.json');

const fakeJourney = (req: express$Request, res: express$Response) => {
  const CurrencyISO = req.query.currency || _.first(_.keys(currencyVars));
  const details: any = {
    CurrencyISO,
  };
  const fakeUser: any = {
    _id: '',
    details,
    extras: {
      level: parseInt(req.query.level || 5),
    },
  };
  req.user = fakeUser;
  utils.initContext(req, res, fakeUser, { code: req.params.lang });
  const balance: any = {
    CurrencyISO,
    CurrentLoyaltyPoints: 1234,
    PromotionPlayerStatuses: {
      PromotionPlayerStatus: [
        {
          Promotion: {
            AchievementStartDate: new Date(),
            AchievementEndDate: new Date(),
          },
          TotalBet: 123121233,
        },
      ],
    },
  };
  const bonuses: any = [];

  const journey = new Journey(req, balance, bonuses, details);
  return journey;
};

const getBanners = (): Array<any> =>
  _.flatten<BannerDef, BannerDef>(_.keys<string>(datastorage.banners())
    .map(location => datastorage.banners(location)
      .map(banner => (
        {
          location,
          id: banner.id,
          source: banner.source || '',
          enabled: banner.enabled,
          type: banner.type,
          tags: banner.rules.tags,
          promotion: banner.rules.promotion || '',
          bonus: banner.rules.bonus || '',
        }
      )
    )
  ));

const bind = function (app: express$Application<express$Request, express$Response>) {
  app.get('/api/admin/banners', (req: express$Request, res: express$Response) => {
    utils.initContext(req, res, null, { code: req.params.lang });
    const banners = getBanners().map(banner =>
      _.extend(
        {
          links: Array.from(languages).map(lang => ({
            lang,
            link: `/api/admin/banners/${lang}/${banner.location}/${banner.id}`,
          })),
        },
        banner,
      ));
    return res.json(banners);
  });

  app.get('/api/admin/banners/:lang/gallery', (req: express$Request, res: express$Response) => {
    const journey = fakeJourney(req, res);
    const banners =
      getBanners()
      .filter(x => x.enabled || req.query.all)
      .map(banner => ({ link: `/api/admin/banners/${req.params.lang}/${banner.location}/${banner.id}`, name: banner.id, location: banner.location, content: journey.getBannerById(req.context, banner.location, banner.id) }));
    return res.render('../admin/banner_gallery', { banners, wrapperclass: `lang-${req.params.lang}`, CDN: configuration.cdn });
  });

  app.get('/api/admin/banners/:lang', (req: express$Request, res: express$Response) => {
    utils.initContext(req, res, null, { code: req.params.lang });
    const journey = new Journey(req);
    const banners = journey.allBanners(req.context, 'frontpage');
    return res.render('../admin/banners', { banners, wrapperclass: `lang-${req.params.lang}`, CDN: configuration.cdn });
  });

  app.get('/api/admin/banners/:lang/:group/:id', (req: express$Request, res: express$Response) => {
    const journey = fakeJourney(req, res);
    const banners = journey.getBannerById(req.context, req.params.group, req.params.id);
    return res.render('../admin/banners', { banners, wrapperclass: `lang-${req.params.lang}`, CDN: configuration.cdn });
  });

  app.get('/api/admin/landers', (req: express$Request, res: express$Response) => {
    const result = (() => {
      const result1 = [];
      const object = datastorage.landers();
      for (const key in object) {
        const path = object[key];
        for (const value of path) {
          const links = (() => {
            const result2 = [];
            for (const lang of Array.from(languages)) {
              if (value[lang]) {
                result2.push({
                  lang,
                  link: `/${lang}/promo/${key}`,
                });
              }
            }
            return result2;
          })();

          result1.push({
            id: key,
            bonus: value.bonus || '',
            type: value.type,
            tags: (value.tags || []).join(', '),
            links: _.compact<{ lang: any, link: string }>(links),
            location: value.location,
          });
        }
      }
      return result1;
    })();
    return res.json(result);
  });

  app.get('/api/admin/campaigns', (req: express$Request, res: express$Response) => res.json(datastorage.campaigns()));

};

module.exports = { bind };
