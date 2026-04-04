import { createModal, closeModals } from '../tools/create-modals';
/* global Application */

export function withdrawalModal(){
  function widthdrawalModalOpen(){
    closeModals();
    Application.ContinueOpeningCashierPopup(null, __url__ + __cashier__ + '?prodID=0&tranType=1');
  }
  let withdrawalArgs = {
    title: 'Hold tight...',
    message:'<p>Before you continue, you should know you can no longer cancel withdrawals. You will need to redeposit in order to continue playing.</p><p>Do you want to continue with your withdrawal?</p>',
    confirmText:'Withdraw',
    rejectText:'Don\'t withdraw',
    acceptCB:widthdrawalModalOpen,
  }
  createModal('withdrawal-modal', withdrawalArgs);
}
