/* global Application */
export function initSpecials(p){
  //  remove old specials from other panels that may still exist in dom.
  let panel = p.panel.ID;
  //  todo, set up args for multiple leagues/sports
  if(panel === "league-list" && p.params[0] === 1 ){
    clearSpecials();
    let viewBlock = document.querySelector('#league-list .tab-switch-responsive-block');
    if(viewBlock){
      let specialsEl = document.createElement('ag-specials');
      let limitAmmount = document.documentElement.classList.contains('IsMobile') ? 2 : 3;
      specialsEl.setAttribute('sport', 'soccer');
      specialsEl.setAttribute('limit', limitAmmount);
      specialsEl.setAttribute('selection-limit', '1');
      specialsEl.setAttribute('by-date', 'true');
      viewBlock.before(specialsEl);
    } else {
      setTimeout(function () {
      console.log('second specials');
        if(Application.getCurrent().ID === "league-list"){
          let viewBlock = document.querySelector('#league-list .tab-switch-responsive-block');
          if(viewBlock){
            let specialsEl = document.createElement('ag-specials');
            let limitAmmount = document.documentElement.classList.contains('IsMobile') ? 2 : 3;
            specialsEl.setAttribute('sport', 'soccer');
            specialsEl.setAttribute('limit', limitAmmount);
            specialsEl.setAttribute('selection-limit', '1');
            specialsEl.setAttribute('by-date', 'true');
            viewBlock.before(specialsEl);
          }
        }
      }, 250);
    }
  }
  if(panel === "league-view" && p.params[1] === 1){
    clearSpecials();
    let leagueId = p.params[0];
    let viewBlock =  document.querySelector('#league-view .league-view-responsive-block');
    if(viewBlock && leagueId){
      let specialsEl = document.createElement('ag-specials');
      let limitAmmount = document.documentElement.classList.contains('IsMobile') ? 2 : 3;
      specialsEl.setAttribute('sport', 'soccer');
      specialsEl.setAttribute('league', leagueId);
      specialsEl.setAttribute('limit', limitAmmount);
      specialsEl.setAttribute('selection-limit', '2');
      specialsEl.setAttribute('by-date', 'true');
      viewBlock.before(specialsEl);
    } else {
      setTimeout(function () {
        console.log('second specials');
        if(Application.getCurrent().ID === "league-view"){
          let viewBlock =  document.querySelector('#league-view .league-view-responsive-block');
          if(viewBlock && leagueId){
            let specialsEl = document.createElement('ag-specials');
            let limitAmmount = document.documentElement.classList.contains('IsMobile') ? 2 : 3;
            specialsEl.setAttribute('sport', 'soccer');
            specialsEl.setAttribute('league', leagueId);
            specialsEl.setAttribute('limit', limitAmmount);
            specialsEl.setAttribute('selection-limit', '2');
            specialsEl.setAttribute('by-date', 'true');
            viewBlock.before(specialsEl);
          }
        }
      }, 250);
    }
  }
  if(panel === "pre-live-betting" && p.params[2] === 1){
    clearSpecials();
    let eventId = p.params[0];
    let viewBlock =  document.querySelector('#pre-live-betting [id^="event-view"].event-view');
    if(viewBlock && eventId){
      let specialsEl = document.createElement('ag-specials');
      specialsEl.setAttribute('sport', 'soccer');
      specialsEl.setAttribute('event', eventId);
      viewBlock.before(specialsEl);
    } else {
      setTimeout(function () {
        console.log('second specials');
        if(Application.getCurrent().ID === "pre-live-betting"){
          let viewBlock =  document.querySelector('#pre-live-betting [id^="event-view"].event-view');
          if(viewBlock && eventId){
            let specialsEl = document.createElement('ag-specials');
            specialsEl.setAttribute('sport', 'soccer');
            specialsEl.setAttribute('event', eventId);
            viewBlock.before(specialsEl);
          }
        }
      }, 250);
    }
  }
  if(panel === "racing-branch-panel"  && p.params[1] === 61){
    clearSpecials();
    let viewBlock = document.querySelector('#racing-branch-panel ag-racing-timetable');
    if(viewBlock){
      let specialsEl = document.createElement('ag-specials');
      specialsEl.setAttribute('sport', 'horse-racing');
      specialsEl.setAttribute('limit', '8');
      specialsEl.classList.add('racing-specials');
      viewBlock.before(specialsEl);
    } else {
      setTimeout(function () {
        console.log('second specials');
        if(Application.getCurrent().ID === "racing-branch-panel"){
          let viewBlock = document.querySelector('#racing-branch-panel ag-racing-timetable');
          if(viewBlock){
            let specialsEl = document.createElement('ag-specials');
            specialsEl.setAttribute('sport', 'horse-racing');
            specialsEl.setAttribute('limit', '8');
            specialsEl.classList.add('racing-specials');
            viewBlock.before(specialsEl);
          }
        }
      }, 250);
    }
  }
}

function clearSpecials(){
  let oldEls = document.querySelectorAll('ag-specials:not(racing-specials)');
  for(let el of oldEls){
    el.remove();
  }
}
