export function checkLastLogin(){
  setTimeout(function(){
    if(typeof(LastLoginPopup) === "undefined"){
      let lastLoginLink =  document.querySelector('.page-header-link[title="Last Login"]');
      if(lastLoginLink){
        lastLoginLink.style.display = 'none';
      }
      let mobLastLoginLink = document.querySelector('.rj-account-block__menu-section:first-of-type a:last-of-type');
      if(mobLastLoginLink){
        mobLastLoginLink.style.display = 'none';
      }
    }
  }, 500);
};
