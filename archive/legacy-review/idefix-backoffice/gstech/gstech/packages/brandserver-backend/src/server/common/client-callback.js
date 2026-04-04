/* @flow */
const { md5 } = require('gstech-core/modules/crypt');
const configuration = require('./configuration');
const logger = require('./logger');
const redis = require('./redis');

const addToList = async (req: express$Request, list: string, value: string) => {
  if (req.session != null) {
    const session = req.session.id;
    await redis.addToList(`${session}-${list}`, value);
  }
};

const getLists = async (req: express$Request, lists: string[]) => {
  const result: { [string]: Array<string> } = {};
  if (req.session != null) {
    const session = req.session.id;
    for (let a = 0; a < lists.length; a++) {
      const r = await redis.flushList(`${session}-${lists[a]}`);
      if (r && r.length > 0) {
        result[lists[a]] = r;
      }
    }
  }
  return result;
};

const loadScript = async (req: express$Request, script: string) => {
  await addToList(req, 'scripts', script);
  logger.debug('Add client loadScript script', { username: req.user?.username, script });
};

const callback = async (req: express$Request, url: string) => {
  await addToList(req, 'callbacks', url);
  logger.debug('Add client callback url', { username: req.user?.username, url });
};

const execute = async (req: express$Request, script: string) => {
  await addToList(req, 'executes', script);
  logger.debug('Add client execute script', { username: req.user?.username, script });
};

const expose = async (req: express$Request): Promise<any> => {
  if (!configuration.productionMode()) {
    execute(req, `console.log("callback:${Date.now()}");`);
  }

  const events = await getLists(req, ['callbacks', 'executes', 'scripts']);
  const { scripts, executes, callbacks } = events;
  if (callbacks || scripts || executes) {
    logger.debug('Client callbacks!', { username: req.user?.username, path: req.path, events });
  }
  return events;
};

const pushEvent = async (req: express$Request, event: any): Promise<void> => {
  const events = ['window.dataLayer = window.dataLayer || [];'];
  if (req.user != null) {
    events.push(`window.dataLayer.push(${JSON.stringify({ player: md5(req.user.username), affiliate: req.user.details.AffiliateRegistrationCode })});`);
  }
  events.push(`window.dataLayer.push(${JSON.stringify(event)});`);
  return execute(req, events.join(''));
};

const render = async (req: express$Request): Promise<string> => {
  const scripts = await expose(req);
  const result = [];
  if (scripts.executes) result.push(scripts.executes.join(''));
  if (result.length > 0) {
    return `<script>${result.join('')}</script>`;
  }
  return '';
};

module.exports = { loadScript, callback, expose, execute, pushEvent, render };
