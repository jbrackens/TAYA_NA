/* @flow */
import type { GameDef } from "./games/index";
import type { Journey } from '../api';

const _ = require('lodash');
const fs = require('fs');
const { languages, mapLang } = require('../localization');
const repository = require('../repository');
const { handleError } = require('../extensions');
const liveagent = require("../liveagent");
const clientCallback = require('../client-callback');
const configuration = require('../configuration');
const { getNumberOfPendingWithdrawals } = require('./withdraw');
const { createJourney, createNonloggedinJourney } = require('../journey');
const tc = require('./tc');
const notifications = require('../notifications');
const {
  updateDetails,
} = require('../router-helpers');
const { localize } = require('../localization');
const questionnaires = require("./questionnaires");
const { getJurisdiction } = require('./jurisdiction');
const { registrationFormData } = require('../router-helpers');

const clientLocalizations = configuration.requireProjectFile('./data/client.json');

const scripts = [];
const clientConfig = configuration.clientConfig();

scripts.push(`<script>
  if (top.location.href != self.location.href) { top.location.href = self.location.href; }
  window.clientConfig = ${JSON.stringify(clientConfig)};
  window.dataLayer = window.dataLayer || [];
  window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
</script>`);

if (clientConfig.gtm != null)
  scripts.push(fs.readFileSync(configuration.projectFile('../../pug/common/gtm.html')).toString());
else
  scripts.push(fs.readFileSync(configuration.projectFile('../../pug/common/ga.html')).toString());
if (clientConfig.gaAccount != null)
  scripts.push(`<script>
    if (window.clientConfig) {
      ga('create', '${clientConfig.gaAccount}', '${clientConfig.gaDomain}');
      ga('require', 'displayfeatures');
      ga('require', 'urlChangeTracker');
    }
  </script>`);
scripts.push(fs.readFileSync(configuration.projectFile('../../pug/common/cookiebot.html')).toString());

const recommendations = [
  'Play’n GO',
  'NetEnt',
  'Red Tiger / Red Tiger Gaming',
  'Evolution',
  'Pragmatic',
  'Big Time Gaming',
  'Booming Games',
  'Nolimit City',
  'Gamomat',
  'Eyecon',
  'Synot',
  'BF Games',
  'Yggdrasil',
  'Microgaming',
];


const mapManufacturer = (game: GameDef) => game.ManufacturerOverride || game.Manufacturer;

const mapGameTags = (game: GameDef, extras: string[] = []) => {
  const result = [].concat(extras);
  if (game.Promoted) result.push('promo');
  if (game.New) result.push('new');
  if (game.Jackpot) result.push('jackpot');
  if (game.DropAndWins) result.push('dropandwins');
  return result;
};

const getGameCategories = (req: express$Request, games: Array<
  {
    group: void | string,
    hash: any,
    id: string,
    jackpotValue: void | string,
    keywords: string,
    link: string,
    manufacturer: string,
    name: string,
    searchOnly: void | boolean,
    tags: Array<string>,
    thumbnail: string,
    viewMode: string,
    hasDemo: boolean,
  },
>) => {
  const jurisdiction = getJurisdiction(req);
  const hasSomeGames = (tag: string) => games.some(({ tags }) => tags.includes(tag));
  const gameCategories = _.filter(
    [
      { name: 'All', tag: 'all' },
      { name: 'Promo', tag: 'promo' },
      { name: 'Live', tag: 'live' },
      { name: 'New', tag: 'new' },
      { name: 'VideoSlot', tag: 'videoslot' },
      { name: 'Jackpots', tag: 'jackpot' },
      { name: 'TableGame', tag: 'tablegame' },
      { name: 'DropAndWins', tag: 'dropandwins' }
    ],
    ({ tag }) => {
      if (tag === 'all') return true;
      if (jurisdiction === 'GNRS' && ['jackpot', 'tablegame', 'live'].includes(tag)) return false;
      if (['promo', 'dropandwins'].includes(tag)) return hasSomeGames(tag);
      return true;
    },
  );
  return gameCategories;
};

const getGames = (req: express$Request, journey: Journey) => {
  const games = repository.games(req.context, journey);
  return games.map(game => {
    const viewMode = game.ViewMode || 'single';
    const hash = (game.Meta && game.Meta[viewMode]) || undefined;
    return {
      id: game.Permalink,
      hash,
      group: game.Group,
      keywords: game.Keywords,
      thumbnail: game.Thumbnail,
      jackpotValue: getJurisdiction(req) === 'GNRS' ? undefined : game.JackpotValue,
      name: game.Name,
      manufacturer: mapManufacturer(game),
      link: game.Group ? `/loggedin/group/${game.Permalink}/` : `/loggedin/game/${game.Permalink}/`,
      viewMode,
      tags: mapGameTags(game, [game.Category.toLowerCase()]),
      searchOnly: game.SearchOnly || undefined,
      hasDemo: game.HasPlayForFun,
    };
  });
};

const getClientConfigHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> =>
  res.json({
    css: configuration.cdn('css/all.css'),
    cdn: configuration.cdnBase(),
    thumbsCdn:
      configuration.thumbsCdnBase != null ? configuration.thumbsCdnBase() : configuration.cdnBase(),
    bonusThumbsCdn:
      configuration.bonusThumbsCdnBase != null
        ? configuration.bonusThumbsCdnBase()
        : configuration.cdnBase(),
    scripts,
    languages: languages.map(mapLang),
  });

const getInitialClientStateHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const [tcOk, requiredQuestionnaires, pendingWithdraws] = await Promise.all([tc.getTcOk(req), questionnaires.getRequiredQuestionnaires(req), getNumberOfPendingWithdrawals(req)]);
    const journey = await createJourney(req);

    const games = getGames(req, journey);
    const categories = getGameCategories(req, games);
    const jurisdiction = getJurisdiction(req);
    const details = await updateDetails(journey);
    const banners = journey.updateBanners(req.context);
    const notificationCount = await notifications.numberOfNotifications(req, journey);
    const update = {
      details,
      banners,
      balance: journey.balance.ui,
      notificationCount,
      pendingWithdraws,
    };
    const formData = await registrationFormData(req);
    const data = {
      // FIXME: need to figure better way to exclude betby. perhaps a separate directory
      games: games.filter(g => g.id !== 'betby' && g.id.toLowerCase() !== 'sportsbook'),
      categories,
      jurisdiction,
      player: { ..._.pick(req.user.details, ['FirstName', 'CurrencyISO', 'CountryISO']), ..._.pick(req.user, ['username', 'email', 'languageISO']), currencySymbol: repository.currencySymbol(req.user.details.CurrencyISO) },
      search: {
        recommendations,
      },
      classes: [`lang-${req.context.languageISO}`, `currency-${req.context.currencyISO.toLowerCase()}`, `country-${req.context.countryISO || 'XX'}`],
      requestTc: !tcOk,
      requiredQuestionnaires,
      mobile: req.context.mobile,
      update,
      config: {
        paymentiq: configuration.paymentiq,
        liveagent: liveagent.clientConfig(journey),
        ws: process.env.KALEVALA_V2 ? {
          url: configuration.baseUrl('/ws').replace(/^http/, 'ws'),
        } : undefined,
      },
      formData,
    };
    return res.json(data);
  } catch (e) {
    return handleError(req, res, e);
  }
};
const getInitialNonloggedinClientStateHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const journey = createNonloggedinJourney(req);

    const games = getGames(req, journey);
    const categories = getGameCategories(req, games);
    const jurisdiction = getJurisdiction(req);
    const banners = journey.updateBanners(req.context, ['nonloggedin']);
    const update = { banners };
    const callbacks = await clientCallback.expose(req);
    const data = {
      // FIXME: need to figure better way to exclude betby. perhaps a separate directory
      games: games.filter((g) => g.id !== 'betby' && g.id.toLowerCase() !== 'sportsbook'),
      categories,
      jurisdiction,
      search: {
        recommendations,
      },
      classes: [
        `lang-${req.context.languageISO}`,
        `currency-${req.context.currencyISO.toLowerCase()}`,
        `country-${req.context.countryISO || 'XX'}`,
      ],
      mobile: req.context.mobile,
      update: { ...update, ...callbacks },
      config: {
        liveagent: liveagent.clientConfig(journey),
      },
    };
    return res.json(data);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const getLocalizationsHandler = (req: express$Request, res: express$Response): express$Response => res.json(clientLocalizations);

const getLocalizationFileHandler = (req: express$Request, res: express$Response): express$Response => {
  const content = localize(req.context.languageISO)(`files.${req.params.file}`, {}, { format: 'markdown' });
  if (content !== '') return res.json({ content });
  return res.sendStatus(404);
};

module.exports = {
  getClientConfigHandler,
  getInitialClientStateHandler,
  getInitialNonloggedinClientStateHandler,
  getLocalizationsHandler,
  getLocalizationFileHandler,
}
