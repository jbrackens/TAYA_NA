/* global UserInfo */
import { globalDetails } from '../../tools/user-details.js';
export function hideDocUpload(){
  globalDetails.tags().then(function(tags){
  console.log('Not Verified: ', UserInfo.current.IsExternalyVerified === 0, 'EqRed: ', tags.includes('EQUIFAX_RED'), '1.5k: ', tags.includes('KYC_PROMPT_1500'), 'ID verified needed: ', (tags.includes('KYC_TRIGGERED_17') && UserInfo.current.IsIdVerified === 0));
    if (
      !( UserInfo.current.IsExternalyVerified === 0 || tags.includes('EQUIFAX_RED') ||
         ((tags.includes('KYC_PROMPT_1000') || tags.includes('KYC_PROMPT_1500') || tags.includes('KYC_TRIGGERED_17') ) && UserInfo.current.IsIdVerified === 0))
    ){
      document.querySelector('body').classList.add('no-doc-upload');
    }
  })
}
// hide block unless any of these are true
// unverified
// equifax red
// 1.5k deposits
// 1.7k deposits and no id.
