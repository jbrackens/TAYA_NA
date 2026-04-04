import { agHttpRequestT } from '../utils/agHttpRequest.js';

function createSportBanner(page,banner){
  let sBanner = document.querySelector('#banner-under-odds') ?? document.createElement('div');

  sBanner.id = 'banner-under-odds';
  if(banner.position){
    sBanner.classList.remove('banner-above');
  } else {
    sBanner.classList.add('banner-above');
  }
  if(page === 'league-view'){
    let container = document.querySelector('#league-view .league-view-responsive-block');
    container.parentNode.insertBefore(sBanner, container.nextSibling);
  } else if (page === 'league-list'){
    let container = document.querySelector('#league-list .tab-switch-responsive-block');
    container.parentNode.insertBefore(sBanner, container.nextSibling);
  } else if (page === 'all-leagues-per-country'){
    let container = document.querySelector('#all-leagues-per-country .top-leagues-container');
    container.parentNode.insertBefore(sBanner, container.nextSibling);
  } else if (page === 'racing-branch-panel'){
    let container = document.querySelector('#racing-branch-panel .branch-docs-rblock');
    container.parentNode.insertBefore(sBanner, container.nextSibling);
  }
  let img = banner.image_url || 'https://volga.prod.gmx.flipsports.net/' + banner.image.data.asset_url;
  sBanner.innerHTML = `<a href="${banner.link_url}" data-agelement="os-banner" data-bid="Banner Under Odds" data-bdata="${banner.name}"><img src="${img}" /></a>`;
  if(banner.button_text){
    sBanner.innerHTML += `<button class="ag-button">${banner.button_text}</button>`;
  }
  sBanner.setAttribute('data-params', banner.name);
}

function resetSportsBanners(){
  let banner = document.querySelector('#banner-under-odds');
  if(banner){
    banner.textContent = '';
  }
}

function checkSportBanners(page,params,banners){
  let found = false;
  for (let banner of banners){
    let tDate = new Date();
    let s = banner?.start_date ? new Date(banner.start_date.replace(' ','T')) : new Date(0);
    let e = banner?.end_date ? new Date(banner.end_date.replace(' ','T')) : new Date('01-01-2100');
    if(
      e !== 'Invalid Date' &&
      s !== 'Invalid Date' &&
      s < tDate && tDate < e &&
      (((page === 'league-list' || page === 'all-leagues-per-country') && banner.branch_id && banner.branch_id === params[0]) ||
      (page === 'racing-branch-panel' && banner.branch_id && banner.branch_id === params[1]) ||
      (page === 'league-view' && banner.branch_id && banner.league_id && banner.branch_id === params[1] && banner.league_id === params[0]))
    ){
      found = true;
      createSportBanner(page,banner);
      break;
    }
  }
  if(!found){
    resetSportsBanners();
  }
}

export function getSportBanners(page){
  if( page.panel && page.panel.ID && (page.panel.ID === 'league-view' || page.panel.ID === 'league-list' || page.panel.ID === 'all-leagues-per-country' || page.panel.ID === 'racing-branch-panel')){
    return agHttpRequestT('GET', 'https://volga.prod.gmx.flipsports.net/_/items/sn_banner_under_odds?fields=*,image.*')
      .then(function (response){
        console.log('sbresp', response);
        if(response && response.data && response.data.length){
          checkSportBanners(page.panel.ID, page.params, response.data)
        }
      })
      .catch(function(err){
        console.log('caught');
        console.error(err);
      })
  }
}
