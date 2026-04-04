//  the login panel was changed but not all pages had the panel added.
//  this finds if the cufrent page is missing the new panel, and will open whichever panel it has instead
/* global Application, UserInfo */
export function loginFix(){
  // time out gives enough time for buttons to be created and panel list to be generated
  setTimeout(
    function(){
      let headerLoginButton = document.querySelector('a.branded-header__button--login[href*="/pop-up-login-sport/"]');
      if(!Application.Panels['pop-up-login-sport'] && !UserInfo.current && headerLoginButton){
          headerLoginButton.addEventListener('click', Application.openResponsiveLogin);
        }
    }, 250);
}
