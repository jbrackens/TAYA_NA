import { agTagManager } from '../tools/ag-tag-manager.js';
import { globalDetails } from '../tools/user-details.js';
import { createModal, closeModals } from '../tools/create-modals.js';
/* global UserInfo, Application */
export function documentModals(){
  if(UserInfo.current && UserInfo.current.IsIdVerified === 0){
    globalDetails.tags().then(function(userTags){
      if(
        (userTags.includes('KYC_TRIGGERED_17_AMBER') && !sessionStorage.getItem("KYC_PROMPT_1700")) ||
        (userTags.includes('KYC_TRIGGERED_17') && !sessionStorage.getItem("KYC_PROMPT_1700"))
      ){
        let documentModalOpen = function(){
          sessionStorage.setItem(
            'KYC_PROMPT_1700',
            JSON.stringify({
              date: new Date()
            })
          );
          // users may gert both tags at once, so make sure they dont hit the previous modal too
          if(!userTags.includes("KYC_PROMPT_1500_SEEN")){
            localStorage.setItem(
              'KYC_PROMPT_1500',
              JSON.stringify({
                date: new Date()
              })
            );
            agTagManager.add('KYC_PROMPT_1500_SEEN').then(function(resp){
              closeModals();
              openVerification();
            });
          } else {
            closeModals();
            openVerification();
          }
        }
        let documentModalClose = function(){
          sessionStorage.setItem(
            'KYC_PROMPT_1700',
            JSON.stringify({
              date: new Date()
            })
          );
          // users may gert both tags at once, so make sure they dont hit the previous modal too
          if(!userTags.includes("KYC_PROMPT_1500_SEEN")){
            localStorage.setItem(
              'KYC_PROMPT_1500',
              JSON.stringify({
                date: new Date()
              })
            );
            agTagManager.add('KYC_PROMPT_1500_SEEN').then(function(resp){
              closeModals();
            });
          } else {
            closeModals();
          }
        }
        createModal("KYC_PROMPT_1700", {
          title: 'Documents Reminder',
          message:"<p>You have now hit the point in your SportNation journey at which we are required to ask for verification documents. We know this can be inconvenient so as a thank you, <strong>we’ll give you a £20 Free Bet</strong> once they’ve been accepted.</p><br><p>Here’s what we need:</p><ul><li><strong>Proof of ID</strong> - Passport, Drivers Licence or National ID Card (front & back).</li><li><strong>Proof of Address</strong> - A Utility bill or Bank Statement dated within the last 3 months or any Government official documentation. (We’re unable to accept mobile phone bills)</li></ul><br><p>As soon as your docs have been accepted, a £20 Free Bet will be added to your account. This can be used on any sport and is valid for 7 days.</p>",
          confirmText:'Upload Docs Now',
          rejectText:'Remind me later',
          acceptCB:documentModalOpen,
          rejectCB:documentModalClose
        });
      } else if(userTags.includes("KYC_PROMPT_1500") && !userTags.includes("KYC_PROMPT_1500_SEEN") && !localStorage.getItem("KYC_PROMPT_1500")){
        let documentModalOpen = function(){
          localStorage.setItem(
            'KYC_PROMPT_1500',
            JSON.stringify({
              date: new Date()
            })
          );
          agTagManager.add('KYC_PROMPT_1500_SEEN').then(function(resp){
            window.dataLayer.push({
              'event': 'ag-document-modal',
              'document-data': { modalAmmount: 'KYC_PROMPT_1500', event: 'Submit Docs' }
            });
            console.log(resp);
            closeModals();
            openVerification();
          });
        }
        let documentModalClose = function(){
          localStorage.setItem(
            'KYC_PROMPT_1500',
            JSON.stringify({
              date: new Date()
            })
          );
          agTagManager.add('KYC_PROMPT_1500_SEEN').then(function(resp){
            window.dataLayer.push({
              'event': 'ag-document-modal',
              'document-data': { modalAmmount: 'KYC_PROMPT_1500', event: 'Remind Me Later' }
            });
            console.log(resp);
            closeModals();
          });
        }
        createModal("KYC_PROMPT_1500", {
          title: 'Documents Reminder',
          message:"<p>You’re approaching a point in your SportNation journey in which we are required to ask for verification docs. We know this can be inconvenient so as a thank you, <strong>we’ll give you a £20 Free Bet</strong> once they’ve been accepted.</p><br><p>Here’s what we need:</p><ul><li><strong>Proof of ID</strong> - Passport, Drivers Licence or National ID Card (front & back).</li><li><strong>Proof of Address</strong> - A Utility bill or Bank Statement dated within the last 3 months or any Government official documentation. (We’re unable to accept mobile phone bills)</li></ul><br><p>As soon as your docs have been accepted, a £20 Free Bet will be added to your account. This can be used on any sport and is valid for 7 days.</p>",
          confirmText:'Upload Docs Now',
          rejectText:'Remind me later',
          acceptCB:documentModalOpen,
          rejectCB:documentModalClose
        });
      } else if(userTags.includes("KYC_PROMPT_1000") && !userTags.includes("KYC_PROMPT_1500") && !userTags.includes("KYC_PROMPT_1000_SEEN") && !localStorage.getItem("KYC_PROMPT_1000")){
        let documentModalOpen = function(){
          localStorage.setItem(
            'KYC_PROMPT_1000',
            JSON.stringify({
              date: new Date()
            })
          );
          agTagManager.add('KYC_PROMPT_1000_SEEN').then(function(resp){
            window.dataLayer.push({
              'event': 'ag-document-modal',
              'document-data': { modalAmmount: 'KYC_PROMPT_1000', event: 'Submit Docs' }
            });
            console.log(resp);
            closeModals();
            openVerification();
          });
        }
        let documentModalClose = function(){
          localStorage.setItem(
            'KYC_PROMPT_1000',
            JSON.stringify({
              date: new Date()
            })
          );
          agTagManager.add('KYC_PROMPT_1000_SEEN').then(function(resp){
            window.dataLayer.push({
              'event': 'ag-document-modal',
              'document-data': { modalAmmount: 'KYC_PROMPT_1000', event: 'Remind Me Later' }
            });
            console.log(resp);
            closeModals();
          });
        }
        createModal("KYC_PROMPT_1000", {
          title: 'Documents Reminder',
          message:"<p>You are approaching a point in your SportNation journey in which we are required to ask for verification docs. These can sometimes take a day or 2 to process so we advise that you send these beforehand to ensure that your experience is not disrupted.</p><br><p>Here’s what we need:</p><ul><li><strong>Proof of ID</strong> - Passport, Drivers Licence or National ID Card (front & back).</li><li><strong>Proof of Address</strong> - A Utility bill or Bank Statement dated within the last 3 months or any Government official documentation. (We’re unable to accept mobile phone bills)</li></ul>",
          confirmText:'Upload Docs Now',
          rejectText:'Remind me later',
          acceptCB:documentModalOpen,
          rejectCB:documentModalClose
        });
      }
    })
  }
}

function openVerification(){
  if(event){
    event.preventDefault();
  }
  if(Application.Panels['my-account-pop-up']){
   Application.navigateToAccountCheckDocumentBlock();
  } else if(Application.Panels['account-verification-panel']){
   Application.navigateTo('account-verification-panel')
  } else {
   window.location = '/account-verification/';
  }
}
