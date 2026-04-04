/* @flow */
import type { BannerDef } from '../common/banners';
import type { RequestContext } from '../common/api';

const _ = require('lodash');
const { htmlBanner } = require('../common/banners');

const styles = require('./data/inline-styles.json');

export type BannerLocation = 'game' | 'deposit' | 'myaccount-rewards' | 'nonloggedin' | 'frontpage' | 'game-level' | 'myjefe-level' | 'game-bounty' | 'game-wheel' | 'myjefe-bounty' | 'myjefe-wheel';
const bannerTemplate = _.template(`<div class="level-<%- level %> currency-<%- currency %> lang-<%- language %>" id="<%- bannerId %>">
  <div class="background">
    <div class="viewport">
      <span class="item1"></span>
      <span class="item2"></span>
      <span class="item3"></span>
    </div>
  </div>
  <div class="image"></div>
  <%= campaign %>
</div>
<style><%= css %></style>`);

const bountyBannerTemplate = _.template(`<div class="level-<%- level %> currency-<%- currency %> lang-<%- language %>" id="<%- bannerId %>">
  <div class="background"></div>
  <div class="image"></div>
  <%= campaign %>
  <style><%= css %></style>
</div>`);

const campaignTemplate = _.template(`
  <div class="campaign">
    <% if(action && !actiontext){ %>
      <a href="<%- action %>"><% } %>
      <% if(title != ''){ %><h1><%- title %></h1><% } %>
      <% if(subtitle != ''){ %><h4><%- subtitle %></h4><% } %>
      <% if(banner != ''){ %><h3><%= banner %></h3><% } %>
      <% if(actiontext){ %>
        <div class="button-holder">
          <a class="button" href="<%- action %>"><%- actiontext %></a>
        </div>
      <% } %>
    <% if(action && !actiontext){ %></a><% } %>
  </div>
`);

const sidebarBannerTemplate = _.template(`\
<div class="campaign level-<%- level %> currency-<%- currency %>" id="<%- bannerId %>">
  <% if(title != ''){ %><div class="title"><%= title %></div><% } %>
  <div class="image"></div>
  <% if(banner != ''){ %><div class="text"><%= banner %></div><% } %>
  <% if(promotion && promotion.progress !== false) { %>
    <div class="progress-meter-holder">
      <div class="progress-meter progress-meter-complete-<%- promotion.completed %>" style="width: <%- promotion.progress %>%;"></div>
      <div class="progress-meter-target"><%- target %></div>
    </div>
  <% } %>
  <% if(actiontext){ %>
    <div class="button-holder">
      <a class="button cta" href="<%- action %>"><%- actiontext %></a>
    </div>
  <% } %>
</div>
<style><%= css %></style>`);

const style = (location: BannerLocation, banner: BannerDef, data: any) => {
  const id = `${location}_${banner.source || banner.id}`;
  const css = styles[id];
  return _.extend({ css }, data);
};

const sidebarBanner = (location: BannerLocation, banner: BannerDef, data: any): any => {
  const css = [styles[`${location}_${banner.source || banner.id}`], data.style].filter(x => x != null).join('\n');
  return sidebarBannerTemplate(_.extend({ css }, data));
};

const campaignBanner = (location: BannerLocation, banner: BannerDef, data: {...}): string =>
  campaignTemplate(style(location, banner, data));

const bountyBanner = (banner: BannerDef, data: any): any => {
  const css = (styles[`frontpage_${banner.source || banner.id}`] || styles.frontpage_bounty) + data.style;
  return bountyBannerTemplate(_.extend({ css }, data));
};

const mainBanner = (context: RequestContext, location: BannerLocation, banner: BannerDef, data: any): any | string => {
  if (!banner.type || banner.type === 'internal') {
    return bannerTemplate(style(location, banner, data));
  }
  return htmlBanner(context, location, banner, 375);
};

module.exports = { sidebarBanner, mainBanner, bountyBanner, campaignBanner };
