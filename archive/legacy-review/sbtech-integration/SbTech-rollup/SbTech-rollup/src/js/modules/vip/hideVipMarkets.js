/* global Application */
import { globalDetails } from '../tools/user-details';
export function hideLeagues(p){
  console.log('hl, ', p);
  let panel = p.panel.ID;
  window.vipLeague = {
   leagueId: 205437,
   sportId: 79,
   title: 'VIP Specials',
   href: 'vip-specials'
  }
  let styleElem = document.head.appendChild(document.createElement("style"));
    styleElem.id = 'hide-league-style';
    styleElem.innerHTML = `
    body:not(.vip) .vip-only,
    body:not(.vip) a[href*="${window.vipLeague.href}"]{
    display:none;
  }`;
  // go home if on page and not vip.
  if(panel === 'league-view' && window.vipLeague.leagueId === p.params[0]){
    globalDetails.tags().then(function(tags){
      if(!tags.includes('VIP')){
        Application.goHome();
      }
    })
  };
  // if on all leagues per country, just hide the panel
  if(panel === 'all-leagues-per-country'){
    setTimeout(function(){
      hideVipMarkets()
    }, 250);
  }
  if(panel === 'league-list' && window.vipLeague.sportId === p.params[0]){
    let obs = new MutationObserver(hideVipMarketsCB);
    let watcher = document.querySelector('.page.current .tab-switch-tabs div[id*="TopLeaguesResponsiveBlock"]');
    if(watcher){
      obs.observe(watcher, { attributes:true });
      hideVipMarkets();
    } else {
      setTimeout(function(){
        let watcher = document.querySelector('.page.current .tab-switch-tabs div[id*="TopLeaguesResponsiveBlock"]');
        if(watcher){
          obs.observe(watcher, { attributes:true, attributeOldValue: true });
          hideVipMarkets();
        }
      }, 250);
    }
    Application.AfterNavigation.VipObsDisconnect = function(p){
      if(window.vipLeague.sportId !== p.params[0]){
        obs.disconnect();
      }
    }
  }
}
function hideVipMarketsCB(r){
  console.log('market mutation', r);
  if(r && !r[0].target.classList.contains('tab-switch-tab-hidden')){
    hideVipMarkets();
  } else {
    setTimeout(function () {
      let leagueLinks = document.querySelectorAll('.rj-league-list__item-link[href*="' + window.vipLeague.href + '"]');
      for(let link of leagueLinks){
        let toHide = link.closest('.rj-league-list__item-holder');
        toHide?.classList.add('vip-only');
      }
    }, 250);
  }
}

function hideVipMarkets(){
  let panelTitles = document.querySelectorAll('.rj-ev-list__main-heading');
  if(panelTitles.length === 0){
    setTimeout(function(){
      hideVipMarkets()
    }, 250);
  }
  for (let titleEl of panelTitles){
    if( titleEl.textContent.toLowerCase().includes(window.vipLeague.title.toLowerCase())){
      let toHide = titleEl.closest('.rj-ev-list__content');
      toHide?.classList.add('vip-only');
    }
  }
  let buttonTitles = document.querySelectorAll('.rj-league-list__item-holder');
  for (let btnEl of buttonTitles){
    if( btnEl.textContent.toLowerCase().includes(window.vipLeague.title)){
      btnEl.classList.add('vip-only');
    }
  }
}
