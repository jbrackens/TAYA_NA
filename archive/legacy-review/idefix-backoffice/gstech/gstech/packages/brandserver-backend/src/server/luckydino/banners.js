/* @flow */
const _ = require('lodash');
const styles = require('./data/inline-styles.json');

export type BannerLocation = 'game' | 'deposit' | 'myaccount-rewards' | 'nonloggedin' | 'frontpage';

const bannerTemplate: any = _.template(`\
<div id="<%- bannerId %>" class="banner_<%- location %>">
  <div class="background">
    <div class="viewport">
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
  <div class="campaign">
    <% if(title != ''){ %><h1 class="campaign-title"><%= title %></h1><% } %>
    <% if(subtitle != ''){ %><h4 class="campaign-subtitle"><%= subtitle %></h4><% } %>
    <% if(banner != ''){ %><h3 class="campaign-banner"><%= banner %></h3><% } %>
    <% if(actiontext){ %>
      <div class="button-holder">
        <a class="button" href="<%- action %>"><%- actiontext %></a>
      </div>
    <% } %>
  </div>
<% if(action && !actiontext){ %></a><% } %>`);

const imageBannerTemplate: any = _.template('<% if(action != "") { %><a href="<%- action %>"><% } %><div id="<%- bannerId %>"></div><% if(action != ""){ %></a><% } %>');

const progressMeterTemplate: any = _.template(`<div id="<%- bannerId %>">
  <% if(campaignContent) { %>
    <a href="<%- action || '#' %>">
      <div class="image">
        <%= campaignContent %>
      </div>
    </a>
  <% } %>
  <div id="<%- bannerId %>__content">
    <% if(promotion && promotion.progress !== false) { %>
      <div id="<%- bannerId %>__progress">
        <div id="<%- bannerId %>__container1">
          <div id="<%- bannerId %>__container1_wedge" style="transform: rotateZ(<%- d1 %>deg);"></div>
        </div>
        <div id="<%- bannerId %>__container2">
          <div id="<%- bannerId %>__container2_wedge" style="transform: rotateZ(<%- d2 %>deg);"></div>
        </div>
      </div>
    <% } %>
    <% if(title != ''){ %><div id="<%- bannerId %>__content_title"><%= title %></div><% } %>
    <div id="<%- bannerId %>__image"></div>
    <% if(banner != ''){ %><div id="<%- bannerId %>__content_subtitle"><%= banner %></div><% } %>
    <% if(banner != ''){ %><div id="<%- bannerId %>__content_subtitle2"><%= reward.data.type %></div><% } %>
    <% if(banner != ''){ %><div id="<%- bannerId %>__content_subtitle3"><%= reward.data.game %></div><% } %>
    <% if(action && !campaignContent){ %>
      <a class="<%- actiontext != ''?'button':'' %> image" id="<%- bannerId %>__action" href="<%- action %>">
        <% if(rewardscount){ %>
          <div id="<%- bannerId %>__action_badge" class="green badge"><%- rewardscount %></div>
        <% } %>
        <%- actiontext %>
      </a>
    <% } %>
  </div>
</div>`);

const inlineBannerWrapperTemplate = _.template(`<div class="banner-wrapper" data-location="<%- location %>">
  <%= content %>
  <style><%= css %></style>
</div>`);

const inlineBannerWrapper = (location: BannerLocation, id: string, data: mixed): any | string => {
  const css = styles[`${location}_${id}`];
  if (css != null) {
    return inlineBannerWrapperTemplate(_.extend({ css }, data));
  }

  const locationCss = styles[`${location}_${location}`];
  if (locationCss != null) {
    return inlineBannerWrapperTemplate(_.extend({ css: locationCss }, data));
  }
  return '';
};

const idWrapper: any = _.template('<div class="banner-content" id="<%- bannerId %>"><%= content %></div>');

const calculateDial = (value: number): {d1: number, d2: number} => {
  if (value < 50) {
    return { d1: -180 + (value / 50.0) * 180.0, d2: -180 };
  }
  return { d1: 0, d2: (value / 50.0) * 180.0 };
};

module.exports = { imageBannerTemplate, calculateDial, idWrapper, inlineBannerWrapper, progressMeterTemplate, campaignTemplate, bannerTemplate };
