/* global Application */
//  swap to the outright tab when opening a league page with ?outrights as a query string.
export function outrightQuery(retry){
  retry = retry || 0;
  let urlParams = new URLSearchParams(window.location.search);
  let currentBlock = Application.getCurrent().Blocks.find(b=>{return b.class === "LeagueViewResponsiveBlock"});
  function changeOutrightSelection(selection, n){
    n = n || 0;
    let tabs = document.querySelectorAll('div.rj-carousel-item-market__name');
    console.log('trying outright change, l', tabs.length, n);
    if(tabs.length === 0 && n < 10){
      setTimeout(function(){
        n++;
        changeOutrightSelection(selection, n);
      }, 250);
    } else if (n < 10){
      console.log('we have tabs, lets click one');
      for (let tab of tabs){
        if(tab.textContent.toLowerCase().includes(selection.toLowerCase())){
          setTimeout(function(){
            tab.click();
          }, 250);
          break;
        }
      }
    }
  }
  if(currentBlock && urlParams.has('outright')){
    currentBlock.selectChild(1);
    if(urlParams.get('outright')){
      let decodeParam = decodeURIComponent(urlParams.get('outright'));
      changeOutrightSelection(decodeParam);
    }
    window.history.replaceState({}, document.title, window.location.href.replace(window.location.search, ''));
  }  else if(retry < 5 && Application.getCurrent().ID === "league-view"){
    setTimeout(function () {
      retry++;
        outrightQuery(retry);
    }, 250);
  }
}
