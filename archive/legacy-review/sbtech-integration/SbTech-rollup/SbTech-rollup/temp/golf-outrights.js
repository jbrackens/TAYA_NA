Application.AfterNavigation.golfOutright = function(e){
  if(e && e.panel.ID === 'league-view' && e.params && e.params[0] === 24222){
    outrightLoop();
  }
}
function outrightLoop(n){
  n = n || 0;
  setTimeout(function(){
    let tabs = document.querySelectorAll('div.rj-carousel-item-market__name');
    let markets = document.querySelectorAll('.rj-ev-list__heading-title__name');
    console.log('golfwang', tabs.length, markets.length, n);
    if( (tabs.length === 0  || markets.length < 2 ) && n <20){
      n++;
      outrightLoop(n);
    } else if (n <20){
      moveGolfOutrights();
    }
  }, 500);
}
function moveGolfOutrights(){
  let tabs = document.querySelectorAll('div.rj-carousel-item-market__name');
  for (let tab of tabs){
    if(tab.textContent == 'Leader After Round 1 and Win'){
      let container = tab.closest('.rj-carousel-container');
      let el = tab.closest('.rj-carousel-item-market');
      container.insertBefore(el, container.firstChild.nextSibling);
    }
  }
  let markets = document.querySelectorAll('.rj-ev-list__heading-title__name');
  for (let mark of markets){
    if(mark.textContent.includes('Leader After Round 1 and Win')){
      let container = mark.closest('.outrights-container sb-comp');
      let el = mark.closest('.rj-ev-list__content');
      container.insertBefore(el, container.firstChild);
    }
  }
}
