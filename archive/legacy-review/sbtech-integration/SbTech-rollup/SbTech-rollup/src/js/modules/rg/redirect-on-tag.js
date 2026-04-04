import { globalDetails } from '../tools/user-details';
export function redirectOnTag(acceptedPages, tagPages){
  globalDetails.tags(true).then(function(t){
    console.log(t)
    let tags = t;
    let page = window.location.href.split('/');
    for(var i=0;i<tagPages.length; i++){
      if (
        tags.includes(tagPages[i].tag) &&
        (!tagPages[i].pass || !tags.includes(tagPages[i].pass))
      ){
        if (
          !acceptedPages.some(function (p) {
            return page.includes(p);
          })
        ){
          window.location.href = window.location.origin + tagPages[i].page;
        }
      }
    }
  })
}
