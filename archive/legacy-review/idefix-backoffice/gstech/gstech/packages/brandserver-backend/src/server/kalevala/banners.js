/* @flow */
import type { RequestContext } from '../common/api';
import type { BannerDef } from '../common/banners';

const _ = require('lodash');
const configuration = require('../common/configuration');

const styles = configuration.requireProjectFile('./data/inline-styles.json');
const { htmlBanner } = require('../common/banners');

export type BannerLocation = 'game' | 'deposit' | 'myaccount-rewards' | 'nonloggedin' | 'frontpage' | 'game-leaderboard' | 'myaccount-shop';

const bannerTemplate = _.template(`<div class="banner_<%- location %>" id="<%- bannerId %>">
  <div id="<%- bannerId %>__background">
    <div id="<%- bannerId %>__viewport">
      <span id="<%- bannerId %>_item1"></span>
      <span id="<%- bannerId %>_item2"></span>
      <span id="<%- bannerId %>_item3"></span>
      <span id="<%- bannerId %>_item4"></span>
      <span id="<%- bannerId %>_item5"></span>
      <span id="<%- bannerId %>_item6"></span>
      <span id="<%- bannerId %>_item7"></span>
      <span id="<%- bannerId %>_item8"></span>
      <span id="<%- bannerId %>_item9"></span>
      <span id="<%- bannerId %>_item10"></span>
    </div>
  </div>
  <div id="<%- bannerId %>_image"></div>
  <%= campaign %>
</div>`);

const campaignTemplate: any = _.template(`\
<% if(action && !actiontext){ %>
  <a href="<%- action %>"><% } %>
  <div id="<%- bannerId %>_campaign">
    <% if(title && title != ''){ %><div id="<%- bannerId %>_campaign_title"><%- title %></div><% } %>
    <% if(banner && banner != ''){ %><div id="<%- bannerId %>_campaign_content"><%= banner %></div><% } %>
  </div>
  <% if(actiontext){ %>
    <div id="<%- bannerId %>__promo_button_holder">
      <a href="<%- action %>" id="<%- bannerId %>__promo_button"><%- actiontext %></a>
    </div>
  <% } %>
<% if(action && !actiontext){ %></a><% } %>`);

const meterBannerTemplate: any = _.template(`\
<div id="<%- bannerId %>">
  <% if(title != ''){ %><h1 id="<%- bannerId %>__title">
    <%- title %>
  </h1><% } %>
  <% if(subtitle != ''){ %><h4 id="<%- bannerId %>__subtitle"><%- subtitle %></h4><% } %>
  <% if(banner != ''){ %><p id="<%- bannerId %>__banner"><%= banner %></p><% } %>
    <span id="<%- bannerId %>__coin_container">
      <span id="<%- bannerId %>__coins"><%- coins %></span>
      <span id="<%- bannerId %>__coin_<%- type %>"></span>
    </span>
  <div id="<%- bannerId %>__progress_holder" class="promotion-progress-holder">
    <div class="promotion-progress" id="<%- bannerId %>__progress"></div>
  </div>
  <% if(action != ''){ %>
    <div id="<%- bannerId %>__promo_button_holder">
      <a href="<%- action %>" id="<%- bannerId %>__promo_button"><%- actiontext %></a>
    </div>
  <% } %>
</div>`);

const leaderboardBannerTemplate: any = _.template(`\
<div id="<%- bannerId %>">
  <% if(title != ''){ %><h1 id="<%- bannerId %>__title">
    <%- title %>
  </h1><% } %>
  <% if(subtitle != ''){ %><h4 id="<%- bannerId %>__subtitle"><%- subtitle %></h4><% } %>
  <% if(banner != ''){ %>
    <%= banner %>
  <% } %>
  <p id="<%- bannerId %>__leaderboard_header"><%- headertext %></p>
  <%= leaderboard %>
  <% if(action != ''){ %>
    <div id="<%- bannerId %>__promo_button_holder">
      <a href="<%- action %>" id="<%- bannerId %>__promo_button"><%- actiontext %></a>
    </div>
  <% } %>
</div>`);

const inlineBannerWrapperTemplate = _.template(`<div class="banner-wrapper" data-location="<%- location %>">
  <%= content %>
  <style><%= css %></style>
</div>`);

const inlineBannerWrapper = (id: string, data: { location: string, content: string }): any | string => {
  const { location, content } = data;

  const css = styles[`${location}_${id}`];
  if (css != null) {
    return inlineBannerWrapperTemplate(_.extend({ css }, data));
  }

  const locationCss = styles[`${location}_${location}`];
  if (locationCss != null) {
    return inlineBannerWrapperTemplate(_.extend({ css: locationCss }, data));
  }

  if (content != null) {
    return content;
  }
  return '';
};

const mainBanner = (context: RequestContext, bannerId: string, location: BannerLocation, banner: BannerDef, data: any): any | string => {
  if (banner && (!banner.type || banner.type === 'internal')) {
    return bannerTemplate({
      location,
      bannerId,
      campaign: data,
    });
  }
  return htmlBanner(context, location, banner);
};

module.exports = { inlineBannerWrapper, leaderboardBannerTemplate, meterBannerTemplate, mainBanner, campaignTemplate };
