// if user is on casino
// get the time from token
// adjust for dailight savings
// if late at night, create modal 1

// if no modal1 confirmed && no modal2 && no localstorage

  // modal 1 shows continue or fuck off
  // continue goes to backend (who add tag after 1 hour)
  // add tag 2AM_CASINO_YES
  // also adds local storage to prevent doublemodals
  // fuck off goes to home page

// if 2AM_POPUP && no confirm tag or localstorage
  // show modal2
    // if continue, send to backend, add 2AM_CASINO_PLAY, close modal
    // if learn more, add 2AM_CASINO_LEARN, redirect to RG page
/* global Application, PlatformJWTManager */
import { agHttpRequestT } from '../utils/agHttpRequest.js';
import { generateSBToken } from '../utils/generateSbToken.js';
import { parseJwt, isToday } from '../utils/general.js';
import { agTagManager } from '../tools/ag-tag-manager.js';
import { agNoteManager } from '../tools/ag-note-manager.js';
import { globalDetails } from '../tools/user-details.js';
import { createModal, closeModals } from '../tools/create-modals.js';

function checkCasinoModals(){
  function checkLocalTags(tag){
    let storageItem = localStorage.getItem(tag);
    let localValue = false;
    if(storageItem){
      try {
        localValue = JSON.parse(storageItem);
      } catch{
        localValue = false;
      }
    }
    if(localValue && localValue.date){
      let localDate = new Date(localValue.date);
      if(isToday(localDate)){
        return true;
      }
    }
    return false;
  }
  function lateNightContinue(){
    generateSBToken.onceToken().then(function(token){
      let data = {token: decodeURIComponent(token), casino_2am_consent:true};
      let payload = JSON.stringify(data);
      return agHttpRequestT('POST', 'https://api.rewardsmatrix.com/pc/casino_2am_consent', true, payload)
    }).then(function(){
      localStorage.setItem('2AM_CASINO_FIRST', JSON.stringify({date: new Date()}));
      agTagManager.add('2AM_CASINO_FIRST').then(function(){
        closeModals();
      });
    })
  }
  function tagModalPlay(){
    localStorage.setItem('2AM_CASINO_SECOND', JSON.stringify({date: new Date()}));
    Promise.all([
      agTagManager.add('2AM_CASINO_SECOND'),
      agNoteManager.add('2AM_CASINO, Play, ' + new Date().toGMTString())
    ]).then(function(){
      closeModals();
    })
  }
  function tagModalLearn(){
    localStorage.setItem('2AM_CASINO_SECOND', JSON.stringify({date: new Date()}));
    Promise.all([
      agTagManager.add(['2AM_CASINO_SECOND','LEARN_MORE']),
      agNoteManager.add('2AM_CASINO, Learn, ' + new Date().toGMTString())
    ]).then(function(){
      window.location.href = window.location.origin + '/responsible-gaming-info/';
    })
  }
  globalDetails.tags().then(function(tags){
    // show first modal if late night, not seen modal 1 via tag or local and have been set to see second.
    if( !checkLocalTags('2AM_CASINO_FIRST') && !tags.contains('2AM_CASINO_FIRST') && !tags.contains('2AM_CASINO_POPUP')){
      // show first modal
      createModal('AM_CASINO_FIRST', {
        title:'Hold up, it’s late',
        message:'<p>It’s pretty late at the moment, we just wanted to check that you want to continue?</p>',
        confirmText:'Keep Playing',
        rejectText:'Stop for the Night',
        acceptCB:lateNightContinue,
        rejectCB:Application.goHome
      });
      // if tag for 2nd modal, and no cofirm
    } else if(tags.contains('2AM_CASINO_POPUP') && ( !checkLocalTags('2AM_CASINO_SECOND') && !tags.contains('2AM_CASINO_SECOND') )){
      // show second modal
      createModal('AM_CASINO_SECOND', {
        title:'Hold up, it’s late',
        message:'<p>You\'ve been playing for over an hour since we last contacted you. We just wanted to make sure you\'d like to continue playing, or would you like to learn more about our Responsible Gaming tools?</p>',
        confirmText:'Keep Playing',
        rejectText:'Learn More',
        acceptCB:tagModalPlay,
        rejectCB:tagModalLearn
      });
    }
  })
}

export function checkCasinoTimegate(){
  function getDateFromToken(casToken){
    let decodedToken = casToken ? parseJwt(casToken) : null;
    console.log(decodedToken);
    let decodedDate = casToken ? new Date(decodedToken.iat * 1000) : new Date;
    console.log(decodedDate);
    return decodedDate;
  }
  let casToken =  PlatformJWTManager.getPlatformJWT();
  let tokenDate = getDateFromToken(casToken);
  if( tokenDate.getUTCHours() >= 3 && tokenDate.getUTCHours() < 7 ){
    checkCasinoModals();
  } else {
    //  set timeout to open modal on page i.e. if they never leave page
    let nowTime = tokenDate;
    let runTime;
    // get 1 am next day
    if(nowTime.getHours() < 1){
      runTime = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate(), 2, 0, 0, 0);
    } else {
      runTime = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate() + 1, 2, 0, 0, 0);
    }
    let waitTime = runTime -  nowTime;
    setTimeout(function () { // Wait 2am
        checkCasinoModals();
    }, waitTime);
  }
}
