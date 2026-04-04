/* global Application */
import { globalDetails } from '../tools/user-details';
export function bogRacing(){
  if(Application.getCurrent().ID === 'home'){
    globalDetails.tags().then(function(tags){
      if(tags.includes('BOG')){
        let topnav =  document.querySelector('.scarousel-list');
        if(topnav){
          let firstNav = topnav.firstChild;
          firstNav.querySelector('.qnav-item-title span').innerText = 'Racing: BOG';
        }
      }
    });
  }
}
