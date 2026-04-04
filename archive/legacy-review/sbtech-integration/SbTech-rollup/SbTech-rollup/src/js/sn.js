// styles
import './../styles/sn.scss';
// scripts

import { globalDetails } from './modules/tools/user-details.js';
// import { agTagManager } from './modules/tools/ag-tag-manager.js';
// import { agNoteManager } from './modules/tools/ag-note-manager.js';

import { bogRacing } from './modules/navigation/bogRacing.js';
import { outrightQuery } from './modules/navigation/outrights.js';

import { attachToggleFunction } from './modules/general/toggles.js';
// import { agCookies } from './modules/general/cookie-policy.js';
import { agAddToBetslip } from './modules/general/sbtech-helpers/addToBetslip.js';
import { checkLastLogin } from './modules/general/sbtech-helpers/checkLastLogin.js';
import { hideDocUpload } from './modules/general/sbtech-helpers/hideDocUpload.js';
import { loginFix } from './modules/general/sbtech-helpers/login-panel-fix.js';
import { openHelpSection } from './modules/general/sbtech-helpers/openHelpLinks.js';
import { openRealityCheck } from './modules/general/sbtech-helpers/openRealityCheck.js';
import { timeoutAnalytics } from './modules/general/analytic-helpers.js';

import { checkVerification, checkEPSVerification } from './modules/rg/verification.js';
import { redirectOnTag } from './modules/rg/redirect-on-tag.js';
import { withdrawalModal } from './modules/rg/withdrawal-modal.js';
import { reviewModals } from './modules/rg/review-modal.js';
import { documentModals } from './modules/rg/document-modal.js';
import { moveBetslipErrorMutation } from './modules/betslip/move-betslip-errors.js';
import { checkCasinoTimegate } from './modules/casino/late-night-casino.js';
import { moveCasBundle } from './modules/casino/move-cas-bundle.js';
import { initSpecials } from './modules/angular-blocks/specials-block.js';

import { getFloatingBanners } from './modules/marketing/floating-banner.js';
import { getSportBanners } from './modules/marketing/sports-banners.js';

import { checkVip } from './modules/vip/checkVip.js';
import { hideLeagues } from './modules/vip/hideVipMarkets.js';


/* global UserInfo, Application */
moveCasBundle();
window.openHelpSection = openHelpSection;
window.widthdrawalModal = withdrawalModal;
window.agAddToBetslip = agAddToBetslip;
window.openRealityCheck = openRealityCheck;
// SbTech changed OpenCashier to not open for unverified users, but this is where we display some error information.
Application.OpenCashierPopup = function(e,y){
  e && e.preventDefault();
 Application.ContinueOpeningCashierPopup(e,y);
}

Application.AfterNavigation.scripts = function(e){
  console.debug('AfterNav',e);
  hideLeagues(e);
  initSpecials(e);
  getFloatingBanners();
  window.sbPage = {
    page: e.panel.ID,
    sport: false,
    league: false
  }
  if(e.panel.ID === 'league-list' || e.panel.ID === 'all-leagues-per-country'){
    window.sbPage.sport = e.params[0];
    window.sbPage.league = false;
    getSportBanners(e);
  }
  if(e.panel.ID === 'league-view' || e.panel.ID === 'racing-branch-panel'){
    window.sbPage.sport = e.params[1];
    window.sbPage.league = e.params[0];
    getSportBanners(e);
  }
}

Application.AfterSwitchPanels.outrightQuery = function (p) {
  console.log('AfterSwitchPanels', p)
  if(p && p.ID === "league-view"){
    setTimeout(function () {outrightQuery();}, 50);
  };
}
Application.AfterSwitchPanels.RegStatus = function(e){
  if(e.ID && (e.ID === 'my-account-pop-up' || e.ID === 'account-verification-panel')){
    checkVerification();
  }
}
Application.AfterSwitchPanels.TimeoutAnalytics = function(e){
  if(e.ID && (e.ID === 'my-account-pop-up' || e.ID === 'time-out-facility')){
    timeoutAnalytics();
  }
}
// can run before login
Application.AfterSwitchPanels.cashierFunction = function(e){
  if(e.ID && e.ID === 'eps-transfer'){
    if(UserInfo && UserInfo.current){
      checkEPSVerification();
    } else {
      UserInfo.onLogin.cashierFunction = function(){
        checkEPSVerification();
      }
    }
  }
}

UserInfo.onLogin.scripts = function(){
  console.debug('OnLogin');
  // check if last login block exists and hide link if it doesnt.
  checkLastLogin();
  // update the user tag singleton
  globalDetails.tags(true).then(function(){
    // create modals for deposit totals
    reviewModals();
    documentModals();
    // add hide-doc-upload for users who shouldnt see it
    hideDocUpload();
    //  add vip tag to body,
    checkVip();
    // add bog racing as first item in mobile scroller
    bogRacing();
  });
  // check for casino only scripts
  if(Application.getCurrent().ID.includes('casino-panel')){
    checkCasinoTimegate();
  }
};

UserInfo.onLogin.redirectOnTag = function(){
  // in its own function as brands differ here
  let acceptedPages = ['account-notice', 'terms_and_conditions', 'help', 'contactus', 'documents-upload', 'faq', 'betting-rules', 'privacy_policy', 'responsible-gaming-info'];
  let tagPages = [
    {tag:'bulkrisk',page:'/help/account-notice'},
    {tag:'matchingphonenumber',page:'/help/matching-details'},
    {tag:'REVIEW_RG',page:'/help/more-info/manual'},
    {tag:'REVIEW_AML',page:'/help/more-info/manual'},
    {tag:'REVIEW_MANUAL_AMBER',page:'/help/more-info/manual'},
    {tag:'EQUIFAX_RED',page:'/help/alert/'},
    {tag:'BLK_X',page:'/help/account-notice'}
  ];
  redirectOnTag(acceptedPages,tagPages);
  // set interval for users who stay on site but have tags added.
  setInterval(redirectOnTag(acceptedPages,tagPages),180000);
}


UserInfo.onLogout.vLogout = function(){
  console.log('OnLogout');
  document.querySelector('body').classList.remove('vip');
};

window.addEventListener('load', function () {
  console.debug('AfterLoad');
  moveBetslipErrorMutation();
  // agCookies();
  loginFix();
  attachToggleFunction();
  // if logged in before load, run login events. happens on slow internet
});
console.info('rollupscripts','version: ' + '0.1.7.ver', 'date: __buildDate__');
