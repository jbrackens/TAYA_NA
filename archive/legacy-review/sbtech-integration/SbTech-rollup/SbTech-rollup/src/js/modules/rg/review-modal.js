import { agHttpRequestT } from '../utils/agHttpRequest.js';
import { generateSBToken } from '../utils/generateSbToken.js';
import { agTagManager } from '../tools/ag-tag-manager.js';
import { agNoteManager } from '../tools/ag-note-manager.js';
import { globalDetails } from '../tools/user-details.js';
import { createModal, closeModals } from '../tools/create-modals.js';
export function reviewModals(){
  globalDetails.tags().then(function(userTags){
    let docTags = ["REVIEW_2500_GREEN", "REVIEW_5K_GREEN", "REVIEW_8500_AMBER", "REVIEW_6800_AMBER", "REVIEW_5100_AMBER", "REVIEW_3400_AMBER", "REVIEW_1700_AMBER"];
    let tag;
    function reviewContinue(){
      localStorage.setItem(
        tag,
        JSON.stringify({
          date: new Date()
        })
      );
      Promise.all([
        agTagManager.add(tag + '_SEEN'),
        agNoteManager.add(tag + " Play, " + new Date().toGMTString())
      ]).then(function () {
        closeModals();
      });
    }
    function sendToJira(){
      generateSBToken.onceToken().then(function(token){
        let data = {
          sb_token: decodeURIComponent(token),
          jira_tag: tag,
          jira_issue_type: 'Compliance Account Review'
        };
        let payload = JSON.stringify(data);
        return agHttpRequestT(
          "POST",
          "https://api.rewardsmatrix.com/pc/atm/add_jira",
          true,
          payload
        );
      })
    }
    function reviewLearn(){
      localStorage.setItem(
        tag,
        JSON.stringify({
          date: new Date()
        })
      );
      Promise.all([
        agTagManager.add(tag + '_SEEN'),
        agNoteManager.add(tag + " Learn, " + new Date().toGMTString()),
        sendToJira()
      ]).then(function () {
        window.location.href =
          window.location.origin + "/responsible-gaming-info/";
      });
    }
    for(let t of docTags){
      tag = t;
      if(userTags.contains(tag)){
        let localVal = localStorage.getItem(tag);
        if(!userTags.contains(tag + '_SEEN') && !localVal){
          createModal(tag, {
            title: "Hi from the Responsible Gaming team!",
            message:
              '<p data-attr="' + tag + '">We are just checking in about your deposits. Are you happy to continue or would you like to learn more about our Responsible Gaming tools?</p>',
            confirmText: "Keep Playing",
            rejectText: "Learn More",
            acceptCB: reviewContinue,
            rejectCB: reviewLearn
          });
          break;
        }
      }
    }
  })
}
