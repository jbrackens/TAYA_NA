/* @flow */
import type { BannerDef } from './banners';

const _ = require('lodash');
const logger = require('./logger');
const redis = require('./redis');
const { findLanguage } = require('./localization');
const { common } = require('./router-helpers');

const leaderboardTableTemplate = _.template(`<table id="<%- bannerId %>__leaderboard">
  <%= tablerows %>
  <% if(tablebottom != ''){ %>
    <tr class="divider"><td></td><td></td><td></td></tr>
    <%= tablebottom %>
  <% } %>
</table>`);

const leaderboardTemplate = _.template(`<div class="leaderboard-banner image" id="<%- bannerId %>">
  <div class="campaign" id="<%- bannerId %>__campaign">
    <table id="<%- bannerId %>__leaderboard">
      <%= tablerows %>
      <% if(tablebottom != ''){ %>
        <tr class="divider"><td></td><td></td><td></td></tr>
        <%= tablebottom %>
      <% } %>
    </table>
    <% if(actiontext){ %>
      <div class="button-holder">
        <a class="button" href="<%- action %>"><%- actiontext %></a>
      </div>
    <% } %>
  </div>
</div>`);

const leaderboardRowTemplate = _.template(`<tr class="<%- idx == ownPosition ? ' selected' : '' %>">
  <td class="first-column"><%- Position %></td>
  <td class="middle-column"><%- Name %></td>
  <td class="last-column"><%- Win %></td>
</tr>`);

const leaderboardLastRowTemplate = _.template(`<tr class="selected last-row">
  <td class="first-column">-</td>
  <td class="middle-column"><%- Name %></td>
  <td class="last-column"><%- Win %></td>
</tr>`);

const update = async (value: any): Promise<void> => redis.set('leaderboard:today', value);

const get = redis.registerDataSource('leaderboard:today');

const resultList = (req: express$Request, items: number = 5) => {
  const b = get();
  if (b == null) {
    logger.error('Unable to find leaderboard');
    return { tablerows: [], tablebottom: [] };
  }
  const ownPosition = _.findIndex(b.value, x => req.user && x.UserName === req.user.username);
  const top = _.take(b.value, items).filter(x => parseFloat(x.Win) > 0);
  const tablerows = top.map((x, idx) => _.extend({ idx, ownPosition }, x));
  const tablebottom = ownPosition !== -1 && ownPosition >= top.length ? [_.extend({ ownPosition, idx: ownPosition }, b.value[ownPosition])] : [];
  return { tablerows, tablebottom };
};

const mapPosition = (o: { idx: number, ownPosition: number } & any) =>
  _.extend({}, o, { Position: parseFloat(o.Win) > 0 ? `${o.idx + 1}.` : '-' });

const create = (req: express$Request, location: string, banner: BannerDef, items: number = 5, tableOnly: boolean = false): any => {
  const { tablerows, tablebottom } = resultList(req, items);
  const tmpl = tableOnly ? leaderboardTableTemplate : leaderboardTemplate;
  return tmpl({
    tablerows: tablerows
      .map(mapPosition)
      .map(leaderboardRowTemplate)
      .join(''),
    tablebottom: tablebottom
      .map(mapPosition)
      .map(leaderboardLastRowTemplate)
      .join(''),
    bannerId: `banner_${location}_${banner.id}`,
    action: banner.action,
    actiontext: banner[req.context.languageISO] != null ? banner[req.context.languageISO].action : undefined,
  });
};

const getLeaderboardHandler =  (req: express$Request, res: express$Response): express$Response => {
  const { items }: { items: number } = (req.query: any);
  const dummyBanner: any = { id: 'leaderboard' };
  const table = create(req, 'game-leaderboard', dummyBanner, items || 10, true);
  return res.render('leaderboard', _.extend({ leaderboard: table }, common(findLanguage(req.context.languageISO), req, res)));
};

module.exports = {
  create,
  update,
  getLeaderboardHandler,
};
