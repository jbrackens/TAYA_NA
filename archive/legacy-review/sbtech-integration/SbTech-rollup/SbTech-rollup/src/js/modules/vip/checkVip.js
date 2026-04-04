/* global UserInfo */
import { globalDetails } from '../tools/user-details';
export function checkVip(){
  globalDetails.tags().then(function(tags){
    if(tags.includes('VIP') || tags.includes('RBOOST')){
      document.querySelector('body').classList.add('vip');
      UserInfo.onLogout.vLogout = function(){
        document.querySelector('body').classList.remove('vip');
      };
    }
    if(tags.includes('VIPREWARDS')){
      document.querySelector('body').classList.add('viprewards');
      UserInfo.onLogout.vLogout = function(){
        document.querySelector('body').classList.remove('viprewards');
      };
    }

  })
}
