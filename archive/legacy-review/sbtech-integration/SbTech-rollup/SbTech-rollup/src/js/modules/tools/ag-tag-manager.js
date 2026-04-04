import { agHttpRequestT } from '../utils/agHttpRequest';
import { generateSBToken } from '../utils/generateSbToken.js';
export function AgTagManager(){
  let tags = [];
  function getWhitelistTags(){
    return new Promise(function(resolve, reject){
      if(tags.length > 0){
        resolve(tags);
      } else {
        // add helth check
        return generateSBToken.onceToken().then(function(token){
            agHttpRequestT('GET', 'https://api.rewardsmatrix.com/virtual_shop/tags_whitelist/?sb_token=' + token).then(function (response) {
            console.log(response);
            resolve(response)
          }, function (error) {
              reject(error);
          });
        });
      }
    });
  }
  function addTag(tags){
    return new Promise(function(resolve, reject){
      if(typeof(tags) === 'string'){
        tags = [tags];
      }
      if(Array.isArray(tags)){
        generateSBToken.onceToken().then(function(token){
          let data = {sb_token: decodeURIComponent(token), tags: tags };
          let payload = JSON.stringify(data);
          return agHttpRequestT('POST', 'https://api.rewardsmatrix.com/pc/atm/add_tag', true, payload).then(function (response) {
            console.log(response);
            resolve(response);
          });
        })
      } else {
        reject(new Error('tags not recognised'));
      }
    });
  }
  return {
    whitelist: getWhitelistTags,
    add: addTag
  }
};
export const agTagManager = AgTagManager();
