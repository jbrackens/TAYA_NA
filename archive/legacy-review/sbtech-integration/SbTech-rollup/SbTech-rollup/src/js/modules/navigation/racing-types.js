// when on a racing panel or game, add the type as a class to body. to be used to help styling, and to hide/show the horse racing panel.
function checkRacingType(id){
  let pageArray = window.location.pathname.split('/');
  let body = document.querySelector('body');

  if (pageArray.indexOf('greyhounds') > -1){
    body.classList.add('greyhounds');
    body.classList.remove('horse-racing');
  } else if (pageArray.indexOf('horse-racing') > -1){
    body.classList.add('horse-racing');
    body.classList.remove('greyhounds');
  } else if(id && !id.includes('racing')){
    body.classList.remove('greyhounds');
    body.classList.remove('horse-racing');
  }

}

//some navigations dont hcange the url, backup checks for racing block and sets based on data
function checkRacingBlock(){
  console.log('checking racing block');
  let block = Application.getCurrent().Blocks.find(function(b){
    return b.class && b.class == 'RacingCombinedView';
  });
  console.log(block);
  console.log(block && block.dataProvider && block.dataProvider.racingStore);
  console.log(block && block.dataProvider && block.dataProvider.racingStore.branchId);
  if (block && block.dataProvider && block.dataProvider.racingStore){
    let body = document.querySelector('body');
    if(block.dataProvider.racingStore.branchId == '61'){
      body.classList.add('horse-racing');
      body.classList.remove('greyhounds');
    } else if(block.dataProvider.racingStore.branchId == '66'){
      body.classList.add('greyhounds');
      body.classList.remove('horse-racing');
    }
  }
}

window.addEventListener('load', function () {
    setTimeout(function(){checkRacingType()}, 0);
    Application.AfterNavigation.racingNavigation = function(e){
      setTimeout(function(){checkRacingType(e.ID)}, 50);
    };
    Application.AfterSwitchPanels.racingNavigation = function(e){
      console.log('racing test', e);
      if(e.ID && e.ID == 'racing-branch-panel'){
        checkRacingBlock();
      }
    };
});
