/* global UserInfo, PageMethods, CryptoHelper */
function GlobalDetails(){
  let tags;
  let details;
  function clear(){
    tags = '';
    details = '';
    console.log('cleared: ' + tags + details);
  }
  function getExtraData(){
    return new Promise(function(resolve, reject){
      if(details && details.length){
        resolve(details);
      } else if(UserInfo && UserInfo.current){
        PageMethods.GetPersonalDetailsAndPasswordResponsiveBlockData(function(n){
          details = JSON.parse(CryptoHelper.decrypt(n)).Fields;
          resolve(details);
        });
      } else {
        reject(new Error('no user to get details of'));
      }
    })
  }
  function getUserTags(update=false){
    // if not logged in, update on login
    if(!UserInfo || !UserInfo.current){
      UserInfo.onLogin.clearTags = function(){
        globalDetails.clear();
      };
    }
    return new Promise(function(resolve, reject){
      if(tags && tags.length && !update){
        resolve(tags);
      } else {
        PageMethods.GetCurrentUserTags(function(n){
          tags = JSON.parse(n);
          resolve(tags);
        });
      }
    })
  }
  return {
    tags: getUserTags,
    details: getExtraData,
    clear: clear
  }
}
export const globalDetails = GlobalDetails();
