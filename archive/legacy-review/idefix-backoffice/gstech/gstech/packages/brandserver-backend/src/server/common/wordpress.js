/* @flow */
import type { RequestContext } from './api';

const _ = require('lodash');
const { isLocal } = require('gstech-core/modules/config');
const { axios } = require('gstech-core/modules/axios');
const cheerio = require('cheerio');
const logger = require('./logger');
const { Journey } = require('./journey');
const { localizeDefaults } = require('./utils');
const { localize } = require('./localization');
const configuration = require('./configuration');
const utils = require('./utils');
const landers = require('./landers');
const redis = require('./redis');
const { isValidSession } = require('./modules/session');

const populate = (text: string, context: RequestContext) => {
  const text1 = text.replace(/\{€:\s*[\d\.]+\}/gi, (lookup) => {
    const p = localizeDefaults(context);
    const key = lookup.replace(/[\{\}]/g, '');
    const keysc = key.split(':');
    const f = p.currency;
    if (f) {
      const value = keysc[1].trim();
      const result = f(value);
      const p = Math.round((100 * (3 + value.length)) / result.length);
      return `<span style="font-size: ${p}%">${result}</span>`;
    }
    return lookup;
  });

  const text2 = text1.replace(/\{currency:\s*[\d\.]+\}/gi, (lookup) => {
    const p = localizeDefaults(context);
    const key = lookup.replace(/[\{\}]/g, '');
    const keysc = key.split(':');
    // $FlowFixMe[invalid-computed-prop]
    const f = p[keysc[0].trim()];
    if (f) return f(keysc[1].trim());
    return lookup;
  });
  return text2.replace(/\{content:[a-zA-Z\.]+}/g, (lookup) => {
    const key = lookup.replace(/[\{\}]/g, '');
    const keysc = key.split(':');
    const k = keysc[1].trim();
    const value = localize(context.languageISO)(k);
    if (value != null) return utils.populate(value, utils.localizeDefaults(context), 'markdown');
    return lookup;
  });
};

const cache: { [any | string]: void | string } = {};

const getFromCache = async (uri: string): Promise<?string> => {
  logger.debug('>>>> WP:getFromCache', { uri });
  const cached = cache[uri];
  if (cached != null) {
    logger.debug('<<<< WP:getFromCache HIT', { uri });
    return cached;
  }
  if (configuration.productionMode() || isLocal) {
    const cached2 = ((await redis.getTemporary('cms', uri): any): string);
    if (cached2 != null) {
      logger.debug('<<<< WP:getFromCache HIT[redis]', { uri });
      cache[uri] = cached2;
      return cached2;
    }
  }
  return null;
};

const setToCache = async (uri: string, value: string) => {
  cache[uri] = value;
  logger.debug('++++ WP:setToCache [redis]', { uri });
  await redis.setTemporary('cms', uri, value);
  await redis.broadcast('cms', { uri });
};

redis.listenNotifications('cms', (data) => {
  if (data != null) {
    const { uri } = JSON.parse(data);
    logger.debug('>>>> WP:clearFromCache', { uri });
    delete cache[uri];
    logger.debug('<<<< WP:clearFromCache', { cacheKeys: _.keys(cache) });
  }
});

const populatePage = (page: string, req: express$Request) => {
  const populated = populate(page, req.context);
  const $ = cheerio.load(populated);
  return $;
};

const cleanRaw = (text: string) =>
  text.replace(/style=\"width: 1139px; left: 0px;\"/g, 'style="left: 0"'); // FIXME ugly hack for dirty thrive styles

const fetchPage = async (uri: string, printError: boolean = true) => {
  const opts = { uri };
  logger.debug('>>>> WP:fetchPage', { opts });
  try {
    const { data: raw } = await axios.get<string>(uri, { responseType: 'text' });
    const page = cleanRaw(raw);
    await setToCache(uri, page);
    logger.debug('<<<< WP:fetchPage OK', { uri });
    return page;
  } catch (err) {
    if (printError) logger.error('XXX WP:fetchPage', { uri, err: err?.statusCode });
    return '';
  }
};

const renderPage = async (pid: string, lang: string, req: express$Request) => {
  const country = req.context?.country?.CountryISO;
  const uri = (c?: any | void) =>
    `${configuration.cms()}${pid}-${lang}${c ? `-${_.lowerCase(c)}` : ''}/`;
  const page = (await getFromCache(uri(country))) || (await fetchPage(uri(country), !country));
  if (page) return populatePage(page, req);
  return populatePage(country ? (await getFromCache(uri())) || (await fetchPage(uri())) : '', req);
};

// $FlowFixMe[missing-local-annot]
const cleanPage = ($) => {
  $('img').each((idx, img) => {
    $(img).removeAttr('title');
  });

  $('meta[name="robots"]').remove();
  $('link[rel="canonical"]').remove();

  // $(`script[src="${configuration.cms()}wp-includes/js/jquery/jquery.masonry.min.js"]`).remove();
  // $(`script[src="${configuration.cms()}wp-includes/js/imagesloaded.min.js"]`).remove();
  // $(`script[src="${configuration.cms()}wp-includes/js/masonry.min.js"]`).remove();
  $(
    `link[href="${configuration.cms()}wp-content/plugins/thrive-visual-editor/landing-page/templates/css/blank_v2.css"]`,
  ).remove();
};

const deliverPage = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
  lang: string = req.params.lang,
  id: string = req.params.page,
  appendHeaderFooter: boolean = true,
  force: boolean = false,
): Promise<mixed> | Promise<express$Response> => {
  try {
    utils.initContext(req, res, req.user, { code: lang });
    const lander = await landers.get(req, id, force);
    if (lander == null) {
      logger.warn(`!!! WP:deliverPage redirecting -> /${lang}/`, { id, lang });
      return res.redirect(`/${lang}/`);
    }
    const l = lander[lang];

    if (l == null || lander.type === 'redirect') {
      if (lander.type === 'redirect' && lander.location) {
        if (lander.location[0] === '/') return res.redirect(lander.location);
        return res.redirect(`/${req.params.lang}/promo/${lander.location}`);
      }
      return next();
    }

    if (_.has(req.query, 'setlanguage'))
      res.cookie('ld_lang', lang, { maxAge: 900000, httpOnly: false });

    const journey = new Journey(req);
    const loggedin = await isValidSession(req, true);
    if (appendHeaderFooter) {
      if (
        !force &&
        !utils.isWhitelistedIp(req) &&
        !journey.matchRules({ tags: lander.tags || [] })
      ) {
        logger.debug('+++ WP:deliverPage redirect from landing page', {
          landerTags: lander.tags,
          journeyTags: journey.tags,
        });
        return res.redirect(`/${lang}/`);
      }

      if (loggedin) return res.redirect(lander.location || '/loggedin/myaccount/deposit/');
    }
    const affid = req.cookies.ldaffid2;
    const options = _.extend({ id, affid }, _.pick(lander, ['bonus', 'type', 'location']));
    res.expose(options, 'lander');
    const pid =
      lander.type === 'legacy'
        ? 'legacy-lander'
        : utils.populate(lander.source || id, { lang: req.context.languageISO });
    const $ = await renderPage(pid, lang, req);

    $('meta[property="og:url"]').attr('content', configuration.baseUrl(req.originalUrl));

    cleanPage($);
    if (loggedin) $('.state-nonloggedin').remove();
    return res.send($.html());
  } catch (err) {
    logger.warn(`!!! WP:deliverPage redirecting -> /${lang}/`, { err: err?.statusCode });
    return res.redirect(`/${lang}/`);
  }
};

const page = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
  lang: string = req.params.lang,
  id: string = req.params.page,
  data: any = {},
  force: boolean = false,
): Promise<mixed> | Promise<void> | Promise<express$Response> => {
  try {
    utils.initContext(req, res, req.user, { code: lang });
    const lander = await landers.get(req, id, force);
    if (lander == null) {
      logger.warn('!!! WP:page lander not found', { id, lang });
      return res.redirect(`/${lang}/`);
    }
    const l = lander[lang];
    if (l == null || lander.type === 'redirect') {
      if (lander.type === 'redirect' && lander.location) {
        if (lander.location[0] === '/') return res.redirect(lander.location);
        return res.redirect(`/${req.params.lang}/promo/${lander.location}`);
      }
      return next();
    }

    const journey = new Journey(req);

    if (!force && !utils.isWhitelistedIp(req) && !journey.matchRules({ tags: lander.tags || [] })) {
      logger.debug('+++ WP:page Redirect from landing page', {
        landerTags: lander.tags,
        journeyTags: journey.tags,
      });
      return res.redirect(`/${lang}/`);
    }

    const loggedin = await isValidSession(req, true);
    if (loggedin) {
      return res.redirect(lander.location || '/loggedin/myaccount/deposit/');
    }

    const affid = req.cookies.ldaffid2;
    const options = _.extend({ id, affid }, _.pick(lander, ['bonus', 'type', 'location']));
    const pid = lander.type === 'login' || lander.type === 'register' ? 'legacy-lander' : id;
    const $ = await renderPage(pid, lang, req);

    cleanPage($);
    $('head meta[property="og:url"]').remove();
    $('head meta[charset]').remove();
    $('head meta[name="viewport"]').remove();
    $('#registration-form').empty();
    $('#registration-email').empty();
    $('#deposit-registration-form').empty();

    if (lander.type === 'login' || lander.type === 'register') {
      $('#legacy-lander-image img')
        .attr('srcset', '')
        .attr('sizes', '')
        .attr(
          'src',
          configuration.cdn(
            `banners/landers/${utils.populate(lander.image || '', {
              lang: req.context.languageISO,
            })}`,
          ),
        );
      const wrapperCssH1 = $('#legacy-lander-text p:nth-child(1)').attr('data-css');
      const wrapperCssH2 = $('#legacy-lander-text p:nth-child(8)').attr('data-css');
      const wrapperCss = $('#legacy-lander-text p:nth-child(2)').attr('data-css');
      $('#legacy-lander-text').html(
        utils.populate(l.text, utils.localizeDefaults(req.context), 'markdown'),
      );
      $('#legacy-lander-text > *').attr('data-css', wrapperCss);
      $('#legacy-lander-text > h1').attr('data-css', wrapperCssH1);

      $('#legacy-lander-text > h2,h3,h4,h5,h6')
        .attr('data-css', wrapperCssH2)
        .css({ 'font-weight': 'bold !important', 'line-height': '2em' });

      const wrapperCss2 = $('#legacy-lander-disclaimer p').attr('data-css');
      $('#legacy-lander-disclaimer').html(
        utils.populate(l.additional, utils.localizeDefaults(req.context), 'markdown'),
      );
      $('#legacy-lander-disclaimer > *').attr('data-css', wrapperCss2);
    }

    const head = $('head').remove();
    const body = $('html').html();
    const headerTags = [];

    head
      .children()
      .filter((idx, row) => {
        const attr = { ...row.attribs };
        const tag = row.name || row.type;
        const text =
          (row.children || [])
            .filter((row) => row.type === 'text')
            .map((row) => row.data)
            .join('') || undefined;

        if (_.includes(['title', 'meta'], tag) || (tag === 'link' && attr.rel === 'icon')) {
          headerTags.push({
            tag,
            attr: _.isEmpty(attr) ? undefined : attr,
            text,
          });
          return true;
        }
        return false;
      })
      .remove();

    return res.json({ ...data, options, body, head: head.html(), headerTags });
  } catch (err) {
    logger.warn('!!! WP:page landing page fetch failed', { err: err?.statusCode });
    next(err);
  }
};

const bind = (app: express$Application<>) => {
  app.post('/api/integration/wordpress', async (req: express$Request, res: express$Response) => {
    logger.info('>>> WP HOOK', { body: req.body });
    const {
      body: { postPermalink },
    } = req;

    if (postPermalink != null) {
      logger.info('+++ WP HOOK', { postPermalink });
      const resp = (await fetchPage(postPermalink, false)) ? 'ok' : 'empty';
      logger.info('<<< WP HOOK', { resp });
      return res.send(resp);
    }

    logger.error('XXX WP HOOK Invalid request', { postPermalink });
    return res.send('Invalid request');
  });
};

module.exports = { deliverPage, bind, page };
