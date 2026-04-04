/* @flow */
const _ = require('lodash');

const bannerTemplate: any = _.template(`\
  <div class="banner_<%- location %>" id="<%- bannerId %>">
    <div id="<%- bannerId %>_wrapper">
      <div class="promo" id="<%- bannerId %>__promo">
        <div class="image" id="<%- bannerId %>_image"></div>
        <%= campaign %>
      </div>
      <span class="banner_item" id="<%- bannerId %>_item1"></span>
      <span class="banner_item" id="<%- bannerId %>_item2"></span>
      <span class="banner_item" id="<%- bannerId %>_item3"></span>
      <span class="banner_item" id="<%- bannerId %>_item4"></span>
    </div>
  </div>`);

const meterBannerTemplate: any = _.template(`\
<div id="<%- bannerId %>">
  <% if(title != ''){ %>
    <%= title %>
  <% } %>
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

module.exports = { bannerTemplate, meterBannerTemplate };
