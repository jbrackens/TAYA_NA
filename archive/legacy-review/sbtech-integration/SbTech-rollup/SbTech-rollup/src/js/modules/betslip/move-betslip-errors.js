function moveBetslipError(){
  let betSlip = document.querySelector('#idBetsSelections');
  let errorMsgs = document.querySelectorAll('.betSlip-message-warning');
  //  cnnot be combined is ignored or it will add itself again.
  if( betSlip && errorMsgs){
    this.disconnect();
    for(let x = 0; x< errorMsgs.length; x++){
      if(errorMsgs[x].textContent.indexOf("cannot be combined") === -1 && errorMsgs[x].textContent.indexOf("Score changed") && errorMsgs[x].textContent.indexOf("combo") === -1){
        betSlip.appendChild(errorMsgs[x]);
      }
    }
    moveBetslipErrorMutation();
  }
}

//  watch right panel as betslip loaded after pageload event
export function moveBetslipErrorMutation(){
  let betSlip = document.querySelector('#betting_slip');
  let errorObserver = new MutationObserver(moveBetslipError);
  if( betSlip ){
    errorObserver.observe(betSlip, {childList:true, subtree: true });
  } else {
    let rightPanel = document.querySelector('.panel-right-inner');
    if( rightPanel !== null ){
      errorObserver.observe(rightPanel, {childList:true, subtree: true });
    }
  }
}
