export function createModal(id, args){
  let modalEl = document.querySelector('#' + id);
  let body = document.querySelector('body');
  let modalTitle = args.title || 'Hold Up...';
  let modalMessage = args.message || 'Customer Message';
  let modalPositive = args.confirmText || 'Confirm';
  let modalNegative = args.rejectText || 'Reject';
  let accpetModal = args.acceptCB || closeModals;
  let rejectModal = args.rejectCB || closeModals;
  function disableButtons(n, p){
    n.disabled = true;
    p.disabled = true;
  }
  if(modalEl && modalEl.dataset.status === 'closed'){
    modalEl.dataset.status = 'open';
    let negativeButton = modalEl.querySelector('.modal-negative');
    let positiveButton = modalEl.querySelector('.modal-positive');
    if(positiveButton){
      negativeButton.disabled = false;
    }
    if(positiveButton){
      positiveButton.disabled = false;
    }
  } else if (!modalEl){
    let newModal = document.createElement('div');
    newModal.id = id;
    newModal.dataset.status = 'open';
    newModal.classList.add('ag-modal')
    let template = `<div class="modal-container">
        <div class="title-container">${modalTitle}</div>
        <div class="message-container">${modalMessage}</div>
        <div class="button-container">
          <button class="modal-negative">${modalNegative}</button>
          <button class="modal-positive">${modalPositive}</button>
        </div>
      </div>`;
    newModal.innerHTML = template;
    body.appendChild(newModal);
    let negativeButton = newModal.querySelector('.modal-negative');
    let positiveButton = newModal.querySelector('.modal-positive');
    negativeButton.addEventListener("click", function(){
      disableButtons(negativeButton,positiveButton);
      rejectModal();
    });
    positiveButton.addEventListener("click", function(){
      disableButtons(negativeButton,positiveButton);
      accpetModal();
    });
  }
}
export function closeModals(){
  let allModals = document.querySelectorAll('.ag-modal');
  for(let i=0;i<allModals.length;i++){
    allModals[i].dataset.status = 'closed';
  }
}
