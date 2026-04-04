import React from "react";
import { useSelector } from "react-redux";
import has from "lodash/fp/has";
import Box from "@material-ui/core/Box";
import AcceptWithdrawalDialog from "./accept-withdrawal";
import ConfirmCancelWithdrawalDialog from "./confirm-cancel-withdrawal";
import AcceptWithdrawalWithDelayDialog from "./accept-withdrawal-with-delay";
import AccountSuspendDialog from "./account-suspend";
import AccountStatusDialog from "./account-status";
import AddDocumentsDialog from "./add-documents";
import RegisterGamblingProblem from "./register-gambling";
import AddTransactionDialog from "./add-transaction";
import AuthenticationDialog from "./authentication";
import BadRequestDialog from "./bad-request";
import BonusDialog from "./bonus";
import ChangePasswordDialog from "./change-password";
import CreateGameDialog from "./create-game";
import CreateUserDialog from "./create-user";
import CreditBonusDialog from "./credit-bonus";
import CreatePromotionDialog from "./create-promotion";
import CreateGameProfileDialog from "./create-game-profile";
import EditCountryDialog from "./edit-country";
import EditGameDialog from "./edit-game";
import EditGameManufacturerDialog from "./edit-game-manufacturer";
import EditPromotionDialog from "./edit-promotion";
import EditPaymentWageringDialog from "./edit-payment-wagering";
import EditGameProfileDialog from "./edit-game-profile";
import ForfeitBonusDialog from "./forfeit-bonus";
import AddPaymentAccountDialog from "./add-payment-account";
import ViewPaymentAccountDialog from "./view-payment-account";
import AddPlayerNoteDialog from "./add-player-note";
import NetworkConnectionDialog from "./network-connection";
import NetworkFailureDialog from "./network-failure";
import ViewPlayerDocumentDialog from "./view-player-document";
import OverrideDocumentPhotoDialog from "./override-document-photo";
import CancelLimitDialog from "./cancel-limit";
import SetLimitDialog from "./set-limit-dialog";
import RaiseLimitDialog from "./raise-limit-dialog";
import ShowPlayersWithClosedAccounts from "./show-players-with-closed-accounts";
import ConfirmArchivation from "./confirm-archivation";
import ConfirmArchivationPlayerNote from "./confirm-archivation-player-note";
import StealPlayerDialog from "./steal-player";
import ResetPasswordDialog from "./reset-password";
import ConfirmationDialog from "../core/components/confirmation-dialog";
import FullSizeImageDialog from "./full-size-image";
import AskingForReasonDailog from "./asking-for-reason";
import QuestionnaireAnswersDialog from "./questionnaire-answers";
import CompleteDepositTransactionDialog from "./complete-deposit-transaction";
import RequestDocumentsDialog from "./request-documents";
import AddRiskDialog from "./add-risk";
import EditRiskDialog from "./edit-risk";
import AddPlayerConnectionDialog from "./add-player-connection";
import TriggerManualTaskDialog from "./trigger-manual-task";
import AddRewardDialog from "./add-reward";
import ConfirmMarkAsUsed from "./confirm-mark-as-used";
import ConfirmTestPlayerDialog from "./confirm-test-player";
import ConfirmWithdrawalDialog from "./confirm-withdrawal";
import PaymentProviderDetailsDialog from "./payment-provider-details";
import ConfirmDeclineKycDialog from "./confirm-decline-kyc";
import { RootState } from "../rootReducer";

const DialogsContainer = () => {
  const { dialogs, meta } = useSelector((state: RootState) => state.dialogs);

  return (
    <Box>
      {has("confirm-cancel-withdrawal", dialogs) && (
        <ConfirmCancelWithdrawalDialog payload={dialogs["confirm-cancel-withdrawal"]} meta={meta} />
      )}
      {has("accept-withdrawal", dialogs) && (
        <AcceptWithdrawalDialog payload={dialogs["accept-withdrawal"]} meta={meta} />
      )}
      {has("accept-withdrawal-with-delay", dialogs) && (
        <AcceptWithdrawalWithDelayDialog payload={dialogs["accept-withdrawal-with-delay"]} meta={meta} />
      )}
      {has("account-suspend", dialogs) && <AccountSuspendDialog payload={dialogs["account-suspend"]} meta={meta} />}
      {has("account-status", dialogs) && <AccountStatusDialog payload={dialogs["account-status"]} meta={meta} />}
      {has("add-documents", dialogs) && <AddDocumentsDialog payload={dialogs["add-documents"]} meta={meta} />}
      {has("register-gambling-problem", dialogs) && (
        <RegisterGamblingProblem payload={dialogs["register-gambling-problem"]} meta={meta} />
      )}
      {has("add-transaction", dialogs) && <AddTransactionDialog payload={dialogs["add-transaction"]} meta={meta} />}
      {has("authentication", dialogs) && <AuthenticationDialog />}
      {has("bad-request", dialogs) && <BadRequestDialog payload={dialogs["bad-request"]} meta={meta} />}
      {has("bonus", dialogs) && <BonusDialog payload={dialogs["bonus"]} meta={meta} />}
      {has("change-password", dialogs) && <ChangePasswordDialog payload={dialogs["change-password"]} />}
      {has("create-game", dialogs) && <CreateGameDialog payload={dialogs["create-game"]} meta={meta} />}
      {has("create-user", dialogs) && <CreateUserDialog payload={dialogs["create-user"]} meta={meta} />}
      {has("add-player-note", dialogs) && <AddPlayerNoteDialog payload={dialogs["add-player-note"]} meta={meta} />}
      {has("credit-bonus", dialogs) && <CreditBonusDialog payload={dialogs["credit-bonus"]} meta={meta} />}
      {has("edit-country", dialogs) && <EditCountryDialog payload={dialogs["edit-country"]} meta={meta} />}
      {has("edit-game", dialogs) && <EditGameDialog payload={dialogs["edit-game"]} meta={meta} />}
      {has("edit-game-manufacturer", dialogs) && (
        <EditGameManufacturerDialog payload={dialogs["edit-game-manufacturer"]} meta={meta} />
      )}
      {has("edit-payment-wagering", dialogs) && (
        <EditPaymentWageringDialog payload={dialogs["edit-payment-wagering"]} meta={meta} />
      )}
      {has("edit-promotion", dialogs) && <EditPromotionDialog payload={dialogs["edit-promotion"]} meta={meta} />}
      {has("create-promotion", dialogs) && <CreatePromotionDialog payload={dialogs["create-promotion"]} meta={meta} />}
      {has("forfeit-bonus", dialogs) && <ForfeitBonusDialog payload={dialogs["forfeit-bonus"]} meta={meta} />}
      {has("edit-game-profile", dialogs) && (
        <EditGameProfileDialog payload={dialogs["edit-game-profile"]} meta={meta} />
      )}
      {has("create-game-profile", dialogs) && (
        <CreateGameProfileDialog payload={dialogs["create-game-profile"]} meta={meta} />
      )}
      {has("add-payment-account", dialogs) && (
        <AddPaymentAccountDialog payload={dialogs["add-payment-account"]} meta={meta} />
      )}
      {has("view-payment-account", dialogs) && (
        <ViewPaymentAccountDialog payload={dialogs["view-payment-account"]} meta={meta} />
      )}
      {has("view-player-document", dialogs) && (
        <ViewPlayerDocumentDialog payload={dialogs["view-player-document"]} meta={meta} />
      )}
      {has("override-document-photo", dialogs) && (
        <OverrideDocumentPhotoDialog payload={dialogs["override-document-photo"]} meta={meta} />
      )}
      {has("network-failure", dialogs) && <NetworkFailureDialog payload={dialogs["network-failure"]} meta={meta} />}
      {has("set-limit", dialogs) && <SetLimitDialog payload={dialogs["set-limit"]} meta={meta} />}
      {has("raise-limit", dialogs) && <RaiseLimitDialog payload={dialogs["raise-limit"]} meta={meta} />}
      {has("cancel-limit", dialogs) && <CancelLimitDialog payload={dialogs["cancel-limit"]} meta={meta} />}
      {has("show-players-with-closed-accounts", dialogs) && (
        <ShowPlayersWithClosedAccounts payload={dialogs["show-players-with-closed-accounts"]} />
      )}
      {has("confirm-archivation", dialogs) && <ConfirmArchivation payload={dialogs["confirm-archivation"]} />}
      {has("confirm-archivation-player-note", dialogs) && (
        <ConfirmArchivationPlayerNote payload={dialogs["confirm-archivation-player-note"]} />
      )}
      {has("steal-player", dialogs) && <StealPlayerDialog payload={dialogs["steal-player"]} meta={meta} />}
      {has("reset-password", dialogs) && <ResetPasswordDialog payload={dialogs["reset-password"]} />}
      {has("full-size-image", dialogs) && <FullSizeImageDialog payload={dialogs["full-size-image"]} />}
      {has("asking-for-reason", dialogs) && <AskingForReasonDailog payload={dialogs["asking-for-reason"]} />}
      {has("questionnaire-answers", dialogs) && (
        <QuestionnaireAnswersDialog payload={dialogs["questionnaire-answers"]} />
      )}
      {has("complete-deposit-transaction", dialogs) && (
        <CompleteDepositTransactionDialog payload={dialogs["complete-deposit-transaction"]} />
      )}
      {has("add-risk", dialogs) && <AddRiskDialog payload={dialogs["add-risk"]} />}
      {has("edit-risk", dialogs) && <EditRiskDialog payload={dialogs["edit-risk"]} />}
      {has("add-player-connection", dialogs) && (
        <AddPlayerConnectionDialog payload={dialogs["add-player-connection"]} />
      )}
      {has("trigger-manual-task", dialogs) && <TriggerManualTaskDialog payload={dialogs["trigger-manual-task"]} />}
      {has("add-reward", dialogs) && <AddRewardDialog payload={dialogs["add-reward"]} meta={meta} />}
      {has("confirm-mark-as-used", dialogs) && <ConfirmMarkAsUsed payload={dialogs["confirm-mark-as-used"]} />}
      {has("confirm-test-player", dialogs) && <ConfirmTestPlayerDialog payload={dialogs["confirm-test-player"]} />}
      {has("confirm-withdrawal", dialogs) && <ConfirmWithdrawalDialog payload={dialogs["confirm-withdrawal"]} />}
      {has("payment-provider-details", dialogs) && (
        <PaymentProviderDetailsDialog payload={dialogs["payment-provider-details"]} meta={meta} />
      )}
      {has("request-documents", dialogs) && (
        <RequestDocumentsDialog payload={dialogs["request-documents"]} meta={meta} />
      )}
      {has("confirm-decline-kyc", dialogs) && (
        <ConfirmDeclineKycDialog payload={dialogs["confirm-decline-kyc"]} meta={meta} />
      )}

      <ConfirmationDialog />
      <NetworkConnectionDialog />
    </Box>
  );
};

export default DialogsContainer;
