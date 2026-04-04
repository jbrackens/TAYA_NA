/* @flow */
import type { GetContentListResponse } from "gstech-core/modules/clients/campaignserver-api-types";
import type { BannerDef, BannerLocalization } from '../banners';

const _ = require('lodash');
const moment = require('moment-timezone');
const campaignserverClient = require('gstech-core/modules/clients/campaignserver-api');

const languages = require('../localization').languages.map(x => x.code);
const configuration = require('../configuration');

const parseNumber = (s: string, invalidValue: number = 99999) => {
  const n = parseInt(s);
  if (isNaN(n)) {
    return invalidValue;
  }
  return n;
};

const parseRules = (content: any) => ({
  tags: content.tags,
  bonus: content.bonus || undefined,
  promotion: content.promotion || undefined,
  priority: content.priority || undefined,
});

const trim = (r: any) => (r != null ? r.trim() : r);

const parseLanders = (exportData: ((id: string, data: any) => Promise<Array<string>>), errors: Array<string>, rows: GetContentListResponse) => {
  const results: { [string]: any } = {};
  for (const row of Array.from(rows)) {
    const result: Object = {
      bonus: row.content.bonus,
      type: row.subtype,
      image: row.content.image,
      location: row.location,
      enabled: true,
      source: row.content.source || row.name,
      tags: (row.content.tags || []),
    };

    for (const lang of Array.from(languages)) {
      const { actionHeading, additionalInfo, additionalInfoHead, ...rest } = row.content[lang] || row.content[languages[0]];
      const r = {
        additionalheading: additionalInfoHead,
        additional: additionalInfo,
        actionheading: actionHeading,
        ...rest
      }
      if (r.title || r.subtitle || r.text || result.type === 'cms' || result.type === 'redirect' || lang === languages[0]) {
        result[lang] = r;
      } else if (lang !== languages[0]) {
        result[lang] = result[languages[0]];
      }
    }
    results[row.name] = results[row.name] || [];
    results[row.name].push(result);
  }
  errors.push(`${_.size(results)} landers loaded`);
  return exportData('landers', results);
};

const parseBanners = (rows: GetContentListResponse, subtype: string) => {
  const res = [];
  for (const row of Array.from(rows)) {
    const result: BannerDef = {
      id: row.name,
      enabled: true,
      image: row.content.image,
      rules: parseRules(row.content),
      action: row.content.action,
      weight: row.content.weight,
      type: row.subtype || 'internal',
      source: row.content.source,
      wageringRequirement: row.content.wageringRequirement,
    };
    for (const lang of Array.from(languages)) {
      const { heading, text, subheading, title, ...rest } = row.content[lang] || row.content[languages[0]];
      const r: BannerLocalization = {
        title: heading,
        subtitle: subheading,
        banner: text,
        text: title,
        ...rest
      }
      if (r.text || r.title || r.subtitle || r.banner || r.action || r.disclaimer || lang === languages[0]) {
        result[lang] = r;
      } else if (lang !== languages[0]) {
        result[lang] = result[languages[0]];
      } else {
        result[lang] = r;
      }
    }
    if (!subtype || row.location === subtype) {
      res.push(result);
    }
  }
  return res;
};

const collectBanners = (exportData: ((id: string, data: any) => Promise<Array<string>>), errors: Array<string>, banners: GetContentListResponse) => {
  const results = {
    frontpage: parseBanners(banners, 'frontpage'),
    deposit: parseBanners(banners, 'deposit'),
    'myaccount-rewards': parseBanners(banners, 'myaccount-rewards'),
    'myjefe-level': parseBanners(banners, 'myjefe-level'),
    'myjefe-wheel': parseBanners(banners, 'myjefe-wheel'),
    'myjefe-bounty': parseBanners(banners, 'myjefe-bounty'),
    'myaccount-shop': parseBanners(banners, 'myaccount-shop'),
    'game': parseBanners(banners, 'game-sidebar'),
    'game-wheel': parseBanners(banners, 'wheel'),
    'game-level': parseBanners(banners, 'level'),
    'game-bounty': parseBanners(banners, 'bounty'),
    'game-leaderboard': parseBanners(banners, 'game-leaderboard'),
    nonloggedin: parseBanners(banners, 'nonloggedin'),
  };
  errors.push(`${_.size(_.flatten(_.values(results)))} banners loaded`);
  return exportData('banners', results);
};

const parseTournaments = (exportData: ((id: string, data: any) => Promise<Array<string>>), errors: Array<string>, s: GetContentListResponse) => {
  const r = (s || []).map((row) => ({
    startDate: parseInt(moment(row.content.startDate).format('YYYYMMDD')),
    endDate: parseInt(moment(row.content.endDate).format('YYYYMMDD')),
    type: row.subtype,
    promotion: row.content.promotion,
    brands: row.content.brands || [],
  }));
  errors.push(`${_.size(r)} tournaments loaded`);
  return exportData('tournaments', r);
};

const parseCampaigns = (exportData: ((id: string, data: any) => Promise<Array<string>>), errors: Array<string>, s: Array<
  {
    credit: string,
    id: string,
    maximumdepositamount: string,
    minimumdepositamount: string,
    minimumdepositcount: string,
    tags: string,
    titlede: string,
    titleen: string,
    titlefi: string,
    titleno: string,
    titlesv: string,
    type: string,
  },
>) => {
  const r = [];
  for (const row of Array.from(s)) {
    const item: Object = {
      id: row.id,
      tags:
        row.tags != null
          ? row.tags
            .split(',')
            .map(x => x.trim())
            .filter(x => x !== '')
          : undefined,
      mindeposits: parseNumber(row.minimumdepositcount),
      minimumdeposit: parseNumber(row.minimumdepositamount),
      maximumdeposit: parseNumber(row.maximumdepositamount, 100000),
      type: row.type,
      credit: row.credit,
      creditmultiple: false,
    };
    for (const lang of Array.from(languages)) {
      const r = {
        // $FlowFixMe[invalid-computed-prop]
        title: trim(row[`title${lang}`]),
      };
      if (r.title) {
        item[lang] = r;
      } else if (lang !== languages[0]) {
        item[lang] = item[languages[0]];
      }
      if (item.id) {
        if (!r.title) {
          errors.push(`Campaign ${item.id} title not defined in language ${lang}`);
        }
      }
    }
    if (item.id) {
      r.push(item);
    }
  }
  errors.push(`${r.length} campaigns loaded`);
  return exportData('campaigns', r);
};

const jefeLegacy = [
  {
    "id": "CJ_welcome_BookofDead_20",
    "tags": "deposits-0,freespins1",
    "minimumdepositcount": "0",
    "minimumdepositamount": "25",
    "maximumdepositamount": "",
    "type": "bounty",
    "credit": "y2",
    "titleen": "",
    "titlefi": "",
    "titlede": "",
    "titleno": "",
    "titlesv": ""
  },
  {
    "id": "CJ_welcome_TheDogHouseMegaways_40",
    "tags": "deposits-0,freespins1",
    "minimumdepositcount": "0",
    "minimumdepositamount": "50",
    "maximumdepositamount": "",
    "type": "bounty",
    "credit": "y3",
    "titleen": "",
    "titlefi": "",
    "titlede": "",
    "titleno": "",
    "titlesv": ""
  },
  {
    "id": "CJ_welcome_Deadwood_14ss",
    "tags": "deposits-0,freespins1",
    "minimumdepositcount": "0",
    "minimumdepositamount": "100",
    "maximumdepositamount": "",
    "type": "bounty",
    "credit": "y4",
    "titleen": "",
    "titlefi": "",
    "titlede": "",
    "titleno": "",
    "titlesv": ""
  },
  {
    "id": "CJ_welcome_LegacyofDead_14ms",
    "tags": "deposits-0,freespins1",
    "minimumdepositcount": "0",
    "minimumdepositamount": "300",
    "maximumdepositamount": "",
    "type": "bounty",
    "credit": "y5",
    "titleen": "",
    "titlefi": "",
    "titlede": "",
    "titleno": "",
    "titlesv": ""
  },
  {
    "id": "CJ_welcome_RiseofMerlin_20",
    "tags": "deposits-1,freespins2",
    "minimumdepositcount": "1",
    "minimumdepositamount": "25",
    "maximumdepositamount": "",
    "type": "bounty",
    "credit": "y6",
    "titleen": "",
    "titlefi": "",
    "titlede": "",
    "titleno": "",
    "titlesv": ""
  },
  {
    "id": "CJ_welcome_FruitParty_40",
    "tags": "deposits-1,freespins2",
    "minimumdepositcount": "1",
    "minimumdepositamount": "50",
    "maximumdepositamount": "",
    "type": "bounty",
    "credit": "y7",
    "titleen": "",
    "titlefi": "",
    "titlede": "",
    "titleno": "",
    "titlesv": ""
  },
  {
    "id": "CJ_welcome_PunkRocker_10ss",
    "tags": "deposits-1,freespins2",
    "minimumdepositcount": "1",
    "minimumdepositamount": "100",
    "maximumdepositamount": "",
    "type": "bounty",
    "credit": "y8",
    "titleen": "",
    "titlefi": "",
    "titlede": "",
    "titleno": "",
    "titlesv": ""
  },
  {
    "id": "CJ_welcome_BookofDead_14ms",
    "tags": "deposits-1,freespins2",
    "minimumdepositcount": "1",
    "minimumdepositamount": "300",
    "maximumdepositamount": "",
    "type": "bounty",
    "credit": "y9",
    "titleen": "",
    "titlefi": "",
    "titlede": "",
    "titleno": "",
    "titlesv": ""
  },
  {
    "id": "CJ_welcome_BookofDead_20",
    "tags": "deposits-2,freespins3",
    "minimumdepositcount": "2",
    "minimumdepositamount": "25",
    "maximumdepositamount": "",
    "type": "bounty",
    "credit": "y2",
    "titleen": "",
    "titlefi": "",
    "titlede": "",
    "titleno": "",
    "titlesv": ""
  },
  {
    "id": "CJ_welcome_SweetBonanza_40",
    "tags": "deposits-2,freespins3",
    "minimumdepositcount": "2",
    "minimumdepositamount": "50",
    "maximumdepositamount": "",
    "type": "bounty",
    "credit": "y10",
    "titleen": "",
    "titlefi": "",
    "titlede": "",
    "titleno": "",
    "titlesv": ""
  },
  {
    "id": "CJ_welcome_Tombstone_10ss",
    "tags": "deposits-2,freespins3",
    "minimumdepositcount": "2",
    "minimumdepositamount": "100",
    "maximumdepositamount": "",
    "type": "bounty",
    "credit": "y11",
    "titleen": "",
    "titlefi": "",
    "titlede": "",
    "titleno": "",
    "titlesv": ""
  },
  {
    "id": "CJ_welcome_FireJoker_14ms",
    "tags": "deposits-2,freespins3",
    "minimumdepositcount": "2",
    "minimumdepositamount": "300",
    "maximumdepositamount": "",
    "type": "bounty",
    "credit": "y12",
    "titleen": "",
    "titlefi": "",
    "titlede": "",
    "titleno": "",
    "titlesv": ""
  }
];

module.exports = async (exportData: (id: string, data: any) => Promise<string[]>): Promise<Array<string>> => {
  const campaigns = configuration.project() === 'jefe' ? jefeLegacy : [];

  const [tournaments, landers, banners] = await Promise.all([
    campaignserverClient.getContentList(configuration.shortBrandId(), { contentType: 'tournament' }),
    campaignserverClient.getContentList(configuration.shortBrandId(), { contentType: 'landingPage' }),
    campaignserverClient.getContentList(configuration.shortBrandId(), { contentType: 'banner' }),
  ]);
  const errors: string[] = [];

  await Promise.all([
    parseLanders(exportData, errors, landers),
    collectBanners(exportData, errors, banners),
    parseCampaigns(exportData, errors, campaigns),
    parseTournaments(exportData, errors, tournaments),
  ]);
  return errors;
};