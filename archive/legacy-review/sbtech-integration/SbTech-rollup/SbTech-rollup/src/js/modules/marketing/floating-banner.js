import { agHttpRequestT } from '../utils/agHttpRequest.js';
/* global Application */
function createFloatingBanner(banner){
  let fBanner = document.querySelector('#floating-promo-img') ?? document.createElement('div');
  fBanner.id = 'floating-promo-img';
  document.body.appendChild(fBanner);


  let hiddenArray = JSON.parse(localStorage.getItem("hidden_fBanners")) || [];
  if(!Array.isArray(hiddenArray)){
    hiddenArray = [];
  }
  let img = banner.image_url || 'https://volga.prod.gmx.flipsports.net/' + banner.image.data.asset_url;
  fBanner.innerHTML = `<a href="${banner.link_url}" data-agelement="os-banner" data-bid="Mobile Floating Banner" data-bdata="${banner.name}"><img src="${img}" /></a>`;
  fBanner.setAttribute('data-action', 'fbStoreId');
  fBanner.setAttribute('data-params', banner.name);

  window.fbStoreId = function(id){
    document.querySelector('#floating-promo-img').classList.add('banner-hidden');
    document.querySelector('#floating-promo-img').classList.remove('banner-visible');
    let hiddenArray = JSON.parse(localStorage.getItem("hidden_fBanners")) || [];
    if(!Array.isArray(hiddenArray)){
      hiddenArray = [];
    }
    if( hiddenArray.indexOf(id) === -1 ){
      hiddenArray.push(id);
    }
    localStorage.setItem('hidden_fBanners', JSON.stringify(hiddenArray));
  }
  function promoScroller(){
    let fBanner = document.querySelector('#floating-promo-img');
    if(fBanner){
      let scrollPosition = window.pageYOffset;
      const scrollOffset = 180;
      if(scrollPosition > scrollOffset ) {
        fBanner.classList.add('banner-visible')
      }
      else {
        fBanner.classList.remove('banner-visible')
      }
    }
  }
  window.addEventListener('scroll', promoScroller);
  Application.AfterNavigation.clearBanners = function(e){
    let fBanner = document.querySelector('#floating-promo-img');
    if(e.ID !== 'home' && e.ID !== 'league-view' || e.ID !== 'league-list'){
      if(fBanner){
        fBanner.classList.add('banner-hidden');
      }
    } else {
      if(fBanner){
        fBanner.classList.remove('banner-hidden');
      }
    }
  }
}

function checkBanners(banners){
  let hiddenArray = JSON.parse(localStorage.getItem("hidden_fBanners")) || [];
  if(!Array.isArray(hiddenArray)){
    hiddenArray = [];
  }
  for (let banner of banners){
    let tDate = new Date();
    let s = banner?.start_date ? new Date(banner.start_date.replace(' ','T')) : new Date(0);
    let e = banner?.end_date ? new Date(banner.end_date.replace(' ','T')) : new Date('01-01-2100');
    if(hiddenArray.indexOf(banner.name) === -1 && e !== 'Invalid Date' && s !== 'Invalid Date' && s < tDate && tDate < e){
      if((banner.show_on === 'Sports' && window.location.pathname.split('/').filter(t=>t)[0] === 'sports') ||
         (banner.show_on === 'Casino' && Application.getCurrent().ID.includes('casino-panel'))){
        createFloatingBanner(banner);
        break;
      }
    }
  }
}

export function getFloatingBanners(){
  return agHttpRequestT('GET', 'https://volga.prod.gmx.flipsports.net/_/items/sn_mobile_floating_banner?fields=*,image.*')
    .then(function (response){
      if(response && response.data && response.data.length){
        checkBanners(response.data)
      }
    })
    .catch(function(err){
      console.log('caught');
      console.error(err);
    })
}
