
export function agCookies(){
  if (document.cookie.indexOf('hidecookienotice=1') === -1){
    let cookieContainer = document.createElement('div');
    cookieContainer.id = 'cookieContainer';
    let template =
    `<div class="cookieContainerInner">
      <div class="cookieContainerText">
      <p>This website uses cookies to improve your experience. By continuing to use our site, you consent to this use. To find out more, and for information about how to manage cookies, please read our <a href="/privacy_policy/">Cookie Policy</a></p>
      </div>
      <div id="cookieClose">Accept</div>
    </div>`;
    cookieContainer.innerHTML = template;
    document.querySelector('body').appendChild(cookieContainer);
    document.getElementById('cookieClose').addEventListener('click', agAcceptCookiePolicy);
  }
}

function agAcceptCookiePolicy() {
 var cookieExpirationDate = new Date();
 cookieExpirationDate.setFullYear(cookieExpirationDate.getFullYear() + 1);
 document.cookie = 'hidecookienotice=1;path=/; expires=' + cookieExpirationDate.toUTCString();
 document.getElementById('cookieContainer').style.display = 'none';
}
