/* @flow */
import type { RequestContext } from './api';

const shortid = require('shortid');
const configuration = require('./configuration');
const utils = require('./utils');

export type BannerRules = {
  promotion: ?string,
  tags: string[],
  bonus: ?string,
  lastDeposit?: number,
  priority: ?number,
};

export type BannerLocalization = {
  text?: string,
  title?: string,
  subtitle?: string,
  banner?: string,
  action?: string,
  disclaimer?: string,
};

export type BannerDef = {
  enabled?: boolean,
  weight?: number,
  image?: string,
  id: string,
  rules?: BannerRules,
  type?: string,
  source?: string,
  action: string,
  wageringRequirement: number,
  [key: string]: BannerLocalization,
};

const format = (context: RequestContext, content: ?string) => {
  if (content != null) {
    return utils.populate(content.replace(/----$/, ''), utils.localizeDefaults(context));
  }
  return '';
};


const htmlBanner = (context: RequestContext, location: any, banner: BannerDef, height: number = 345): string => {
  const id = `${location}/${banner.id}`;
  const frame = `banner_frame_${shortid.generate()}`;
  const loader = banner.type || 'loader';
  const source = banner.source ? utils.populate(banner.source, { lang: context.languageISO }) : banner.id;

  if (loader === 'iframe') {
    const path = configuration.cdn(`b/${location}/${source}/index.html`);
    return `
    <iframe style="width: 100%; height: ${height}px" allow="autoplay" frameborder="0" allowtransparency="true" seamless="seamless" src="${path}?${banner.action}"></iframe>
    <script>
      window.top.addEventListener("message", function(e) {
        var data = e.data;
        if (data) {
          if (window.pushRoute && data.id === "gwd-button-click") {
            window.pushRoute(data.url);
          }
        }
      });
    </script>`;
  }

  const l = configuration.cdn(`b/${loader}.html`);
  const path = `${l}?b_loc=${id}&b_frame=${frame}`;
  const bannerData = banner[context.languageISO] || {};
  const data = {
    id: 'banner-params',
    url: banner.action,
    lang: context.languageISO,
    text: {
      title: format(context, bannerData.title),
      subtitle: format(context, bannerData.banner),
      description: format(context, bannerData.disclaimer),
      action: format(context, bannerData.action),
    },
  };

  const script = `<script>
    (function () {
      var bannerData= ${JSON.stringify(data)};
      var frame = document.getElementById('${frame}');
      var updateBannerData = function() {
        var f = document.getElementById('${frame}');
        if (f && f.contentWindow) {
          f.contentWindow.postMessage(bannerData, '${l}');
        }
      }

      setTimeout(updateBannerData, 500);
      setTimeout(updateBannerData, 1000);
      setTimeout(updateBannerData, 3000);

      window.top.addEventListener("message", function(e) {
        var data = e.data;
        if (data) {
          if (window.pushRoute && data.id === "gwd-button-click") {
            window.pushRoute(data.url);
          }

          if (data.id === "banner-init" && data.frame === '${frame}' && data.file === '${id}') {
            updateBannerData();
          }
        }
      });
    })();
    </script>`;

  const result = `
    <iframe id="${frame}" style="width: 100%; height: ${height}px" allow="autoplay" frameborder="0" allowtransparency="true" seamless="seamless" src="${path}"></iframe>
    ${script}
  `;
  return result;
};

module.exports = { htmlBanner };
