import has from "lodash/fp/has";
import { FC } from "react";
import Box from "@mui/material/Box";

import {
  AcceptWithdrawalDialog,
  AcceptWithdrawalWithDelayDialog,
  AccountStatusDialog,
  AccountSuspendDialog,
  AddDocumentsDialog,
  AddGameDialog,
  AddPaymentAccountDialog,
  AddPlayerConnectionDialog,
  AddPlayerNoteDialog,
  AddRewardDialog,
  AddRiskDialog,
  AddTransactionDialog,
  AskingForReasonDialog,
  BadRequestDialog,
  BonusDialog,
  CancelLimitDialog,
  ChangePasswordDialog,
  CompleteDepositTransactionDialog,
  ConfirmArchivationPlayerNoteDialog,
  ConfirmArchiveBonusDialog,
  ConfirmationDialog,
  ConfirmCancelWithdrawalDialog,
  ConfirmDeclineKycDialog,
  ConfirmMarkAsUsedDialog,
  ConfirmTestPlayerDialog,
  ConfirmWithdrawalDialog,
  CreateGameProfileDialog,
  CreatePromotionDialog,
  CreateUserDialog,
  CreditBonusDialog,
  EditCountryDialog,
  EditGameDialog,
  EditGameManufacturerDialog,
  EditGameProfileDialog,
  EditPaymentWageringDialog,
  EditPromotionDialog,
  EditRiskDialog,
  ForfeitBonusDialog,
  FullImageDialog,
  LoginDialog,
  NetworkConnectionDialog,
  NetworkFailureDialog,
  OverrideDocumentPhotoDialog,
  PaymentProviderDetailsDialog,
  QuestionnaireAnswersDialog,
  RaiseLimitDialog,
  RegisterGamblingProblemDialog,
  RequestDocumentsDialog,
  ResetPasswordDialog,
  SetLimitDialog,
  ShowPlayersWithClosedAccountsDialog,
  StealPlayerDialog,
  TriggerManualTaskDialog,
  ViewPaymentAccountDialog,
  ViewPlayerDocumentDialog
} from "@idefix-backoffice/idefix/dialogs";
import { useAppSelector, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";
import { AddPlayerConnection } from "../add-player-connection";

const Dialogs: FC = () => {
  const { dialogs, meta } = useAppSelector(dialogsSlice.getDialogs);

  return (
    <Box>
      <>
        {has(DIALOG.ACCEPT_WD, dialogs) && <AcceptWithdrawalDialog payload={dialogs[DIALOG.ACCEPT_WD]} meta={meta} />}
        {has(DIALOG.ACCEPT_WD_WITH_DELAY, dialogs) && (
          <AcceptWithdrawalWithDelayDialog payload={dialogs[DIALOG.ACCEPT_WD_WITH_DELAY]} meta={meta} />
        )}
        {has(DIALOG.ACCOUNT_STATUS, dialogs) && (
          <AccountStatusDialog payload={dialogs[DIALOG.ACCOUNT_STATUS]} meta={meta} />
        )}
        {has(DIALOG.ACCOUNT_SUSPEND, dialogs) && (
          <AccountSuspendDialog payload={dialogs[DIALOG.ACCOUNT_SUSPEND]} meta={meta} />
        )}
        {has(DIALOG.ADD_DOCUMENTS, dialogs) && (
          <AddDocumentsDialog payload={dialogs[DIALOG.ADD_DOCUMENTS]} meta={meta} />
        )}
        {has(DIALOG.ADD_PAYMENT_ACCOUNT, dialogs) && (
          <AddPaymentAccountDialog payload={dialogs[DIALOG.ADD_PAYMENT_ACCOUNT]} meta={meta} />
        )}
        {has(DIALOG.ADD_PLAYER_CONNECTION, dialogs) && (
          <AddPlayerConnectionDialog payload={dialogs[DIALOG.ADD_PLAYER_CONNECTION]} meta={meta}>
            <AddPlayerConnection />
          </AddPlayerConnectionDialog>
        )}
        {has(DIALOG.ADD_PLAYER_NOTE, dialogs) && (
          <AddPlayerNoteDialog payload={dialogs[DIALOG.ADD_PLAYER_NOTE]} meta={meta} />
        )}
        {has(DIALOG.ADD_REWARD, dialogs) && <AddRewardDialog payload={dialogs[DIALOG.ADD_REWARD]} meta={meta} />}
        {has(DIALOG.ADD_RISK, dialogs) && <AddRiskDialog payload={dialogs[DIALOG.ADD_RISK]} meta={meta} />}
        {has(DIALOG.ADD_TRANSACTION, dialogs) && (
          <AddTransactionDialog payload={dialogs[DIALOG.ADD_TRANSACTION]} meta={meta} />
        )}
        {has(DIALOG.ASKING_FOR_REASON, dialogs) && (
          <AskingForReasonDialog payload={dialogs[DIALOG.ASKING_FOR_REASON]} meta={meta} />
        )}
        {has(DIALOG.AUTHENTICATION, dialogs) && <LoginDialog />}
        {has(DIALOG.BAD_REQUEST, dialogs) && <BadRequestDialog payload={dialogs[DIALOG.BAD_REQUEST]} meta={meta} />}
        {has(DIALOG.BONUS, dialogs) && <BonusDialog payload={dialogs[DIALOG.BONUS]} meta={meta} />}
        {has(DIALOG.CANCEL_LIMIT, dialogs) && <CancelLimitDialog payload={dialogs[DIALOG.CANCEL_LIMIT]} meta={meta} />}
        {has(DIALOG.CHANGE_PASSWORD, dialogs) && (
          <ChangePasswordDialog payload={dialogs[DIALOG.CHANGE_PASSWORD]} meta={meta} />
        )}
        {has(DIALOG.COMPLETE_DEPOSIT_TRANSACTION, dialogs) && (
          <CompleteDepositTransactionDialog payload={dialogs[DIALOG.COMPLETE_DEPOSIT_TRANSACTION]} meta={meta} />
        )}
        {has(DIALOG.CONFIRM_ARCHIVATION_BONUS, dialogs) && (
          <ConfirmArchiveBonusDialog payload={dialogs[DIALOG.CONFIRM_ARCHIVATION_BONUS]} meta={meta} />
        )}
        {has(DIALOG.CONFIRM_ARCHIVATION_PLAYER_NOTE, dialogs) && (
          <ConfirmArchivationPlayerNoteDialog payload={dialogs[DIALOG.CONFIRM_ARCHIVATION_PLAYER_NOTE]} meta={meta} />
        )}
        {has(DIALOG.CONFIRM_CANCEL_WD, dialogs) && (
          <ConfirmCancelWithdrawalDialog payload={dialogs[DIALOG.CONFIRM_CANCEL_WD]} meta={meta} />
        )}
        {has(DIALOG.CONFIRM_DECLINE_KYC, dialogs) && (
          <ConfirmDeclineKycDialog payload={dialogs[DIALOG.CONFIRM_DECLINE_KYC]} meta={meta} />
        )}
        {has(DIALOG.CONFIRM_MARK_AS_USED, dialogs) && (
          <ConfirmMarkAsUsedDialog payload={dialogs[DIALOG.CONFIRM_MARK_AS_USED]} meta={meta} />
        )}
        {has(DIALOG.CONFIRM_TEST_PLAYER, dialogs) && (
          <ConfirmTestPlayerDialog payload={dialogs[DIALOG.CONFIRM_TEST_PLAYER]} meta={meta} />
        )}
        {has(DIALOG.CONFIRM_WD, dialogs) && (
          <ConfirmWithdrawalDialog payload={dialogs[DIALOG.CONFIRM_WD]} meta={meta} />
        )}
        {has(DIALOG.CONFIRMATION, dialogs) && <ConfirmationDialog payload={dialogs[DIALOG.CONFIRMATION]} />}
        {has(DIALOG.CREATE_GAME, dialogs) && <AddGameDialog payload={dialogs[DIALOG.CREATE_GAME]} meta={meta} />}
        {has(DIALOG.CREATE_GAME_PROFILE, dialogs) && (
          <CreateGameProfileDialog payload={dialogs[DIALOG.CREATE_GAME_PROFILE]} meta={meta} />
        )}
        {has(DIALOG.CREATE_PROMOTION, dialogs) && (
          <CreatePromotionDialog payload={dialogs[DIALOG.CREATE_PROMOTION]} meta={meta} />
        )}
        {has(DIALOG.CREATE_USER, dialogs) && <CreateUserDialog payload={dialogs[DIALOG.CREATE_USER]} meta={meta} />}
        {has(DIALOG.CREDIT_BONUS, dialogs) && <CreditBonusDialog payload={dialogs[DIALOG.CREDIT_BONUS]} meta={meta} />}
        {has(DIALOG.EDIT_COUNTRY, dialogs) && <EditCountryDialog payload={dialogs[DIALOG.EDIT_COUNTRY]} meta={meta} />}
        {has(DIALOG.EDIT_GAME, dialogs) && <EditGameDialog payload={dialogs[DIALOG.EDIT_GAME]} meta={meta} />}
        {has(DIALOG.EDIT_GAME_MANUFACTURER, dialogs) && (
          <EditGameManufacturerDialog payload={dialogs[DIALOG.EDIT_GAME_MANUFACTURER]} meta={meta} />
        )}
        {has(DIALOG.EDIT_GAME_PROFILE, dialogs) && (
          <EditGameProfileDialog payload={dialogs[DIALOG.EDIT_GAME_PROFILE]} meta={meta} />
        )}
        {has(DIALOG.EDIT_PAYMENT_WAGERING, dialogs) && (
          <EditPaymentWageringDialog payload={dialogs[DIALOG.EDIT_PAYMENT_WAGERING]} meta={meta} />
        )}
        {has(DIALOG.EDIT_PROMOTION, dialogs) && (
          <EditPromotionDialog payload={dialogs[DIALOG.EDIT_PROMOTION]} meta={meta} />
        )}
        {has(DIALOG.EDIT_RISK, dialogs) && <EditRiskDialog payload={dialogs[DIALOG.EDIT_RISK]} meta={meta} />}
        {has(DIALOG.FORFEIT_BONUS, dialogs) && (
          <ForfeitBonusDialog payload={dialogs[DIALOG.FORFEIT_BONUS]} meta={meta} />
        )}
        {has(DIALOG.FULL_SIZE_IMAGE, dialogs) && (
          <FullImageDialog payload={dialogs[DIALOG.FULL_SIZE_IMAGE]} meta={meta} />
        )}
        {has(DIALOG.NETWORK_FAILURE, dialogs) && (
          <NetworkFailureDialog payload={dialogs[DIALOG.NETWORK_FAILURE]} meta={meta} />
        )}
        {has(DIALOG.OVERRIDE_DOCUMENT_PHOTO, dialogs) && (
          <OverrideDocumentPhotoDialog payload={dialogs[DIALOG.OVERRIDE_DOCUMENT_PHOTO]} meta={meta} />
        )}
        {has(DIALOG.PAYMENT_PROVIDER_DETAILS, dialogs) && (
          <PaymentProviderDetailsDialog payload={dialogs[DIALOG.PAYMENT_PROVIDER_DETAILS]} meta={meta} />
        )}
        {has(DIALOG.QUESTIONNAIRE_ANSWERS, dialogs) && (
          <QuestionnaireAnswersDialog payload={dialogs[DIALOG.QUESTIONNAIRE_ANSWERS]} meta={meta} />
        )}
        {has(DIALOG.RAISE_LIMIT, dialogs) && <RaiseLimitDialog payload={dialogs[DIALOG.RAISE_LIMIT]} meta={meta} />}
        {has(DIALOG.REGISTER_GAMBLING_PROBLEM, dialogs) && (
          <RegisterGamblingProblemDialog payload={dialogs[DIALOG.REGISTER_GAMBLING_PROBLEM]} meta={meta} />
        )}
        {has(DIALOG.REQUEST_DOCUMENTS, dialogs) && (
          <RequestDocumentsDialog payload={dialogs[DIALOG.REQUEST_DOCUMENTS]} meta={meta} />
        )}
        {has(DIALOG.RESET_PASSWORD, dialogs) && (
          <ResetPasswordDialog payload={dialogs[DIALOG.RESET_PASSWORD]} meta={meta} />
        )}
        {has(DIALOG.SET_LIMIT, dialogs) && <SetLimitDialog payload={dialogs[DIALOG.SET_LIMIT]} meta={meta} />}
        {has(DIALOG.SHOW_PLAYERS_WITH_CLOSED_ACCOUNTS, dialogs) && (
          <ShowPlayersWithClosedAccountsDialog
            payload={dialogs[DIALOG.SHOW_PLAYERS_WITH_CLOSED_ACCOUNTS]}
            meta={meta}
          />
        )}
        {has(DIALOG.STEAL_PLAYER, dialogs) && <StealPlayerDialog payload={dialogs[DIALOG.STEAL_PLAYER]} meta={meta} />}
        {has(DIALOG.TRIGGER_MANUAL_TASK, dialogs) && (
          <TriggerManualTaskDialog payload={dialogs[DIALOG.TRIGGER_MANUAL_TASK]} meta={meta} />
        )}
        {has(DIALOG.VIEW_PAYMENT_ACCOUNT, dialogs) && (
          <ViewPaymentAccountDialog payload={dialogs[DIALOG.VIEW_PAYMENT_ACCOUNT]} meta={meta} />
        )}
        {has(DIALOG.VIEW_PLAYER_DOCUMENT, dialogs) && (
          <ViewPlayerDocumentDialog payload={dialogs[DIALOG.VIEW_PLAYER_DOCUMENT]} meta={meta} />
        )}
        {has(DIALOG.ACCEPT_WD, dialogs) && <AcceptWithdrawalDialog payload={dialogs[DIALOG.ACCEPT_WD]} meta={meta} />}
        <NetworkConnectionDialog />
      </>
    </Box>
  );
};

export { Dialogs };
