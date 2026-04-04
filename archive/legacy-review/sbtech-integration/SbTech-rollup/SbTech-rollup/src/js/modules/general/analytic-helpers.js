export function timeoutAnalytics(){
  setTimeout(function(){
    document.querySelector('button.facility-timeout__btn').addEventListener("click", timeOutListener)
  }, 250);
}

function timeOutListener(){
  setTimeout(function(){
    let sel = document.querySelector('.facility-timeout__btn-wrap-inner select');
    let period = sel.childNodes[1 + parseInt(sel.value)].textContent;
    var msg = document.querySelector('.rj-popup-message__body-html');
    var btn = document.querySelector('.user-info-p__button[data-uat="button-popup-message-accept"]');
    if(period && msg && btn && msg.textContent.includes('time-out restrictions')){
      btn.addEventListener("click", function(){
        console.log('user timeout, ', period);
        window.dataLayer.push(
        {'event': 'user-timeout',
        'timeout-data': { duration: period }}
        )
      })
    }
  }, 100);
}
