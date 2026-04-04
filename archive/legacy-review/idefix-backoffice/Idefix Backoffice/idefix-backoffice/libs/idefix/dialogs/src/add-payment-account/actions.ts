import { FormikHelpers } from "formik";
import omit from "lodash/fp/omit";
import pick from "lodash/fp/pick";
// import isEmpty from "lodash/fp/isEmpty";

import api from "@idefix-backoffice/idefix/api";
import { AccountDocument, PaymentAccountDraft, DIALOG } from "@idefix-backoffice/idefix/types";
import { AppDispatch, paymentsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { KycProcessPaymentFormValues, PaymentAccountFormValues } from "@idefix-backoffice/idefix/forms";

const mapDocument = (document: AccountDocument) => ({
  ...omit(["formStatus"], document),
  content: document.content
});

const mapAccount = (account: PaymentAccountFormValues) => ({
  ...pick(["method", "account", "kycChecked"], account),
  // TODO check if this reduction in specificity when checking values in parameters is problematic
  parameters: account.parameters ? account.parameters : undefined,
  // parameters: account.parameters && !isEmpty(account.parameters.bic) ? account.parameters : undefined,
  documents: account.documents?.map(mapDocument)
});

interface Props {
  playerId: number;
  values: any;
  formikActions: FormikHelpers<PaymentAccountFormValues> | FormikHelpers<KycProcessPaymentFormValues>;
}

export const addPaymentAccount =
  ({ playerId, values, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      const newPaymentAccountId = await api.players.addPaymentAccount(
        playerId,
        mapAccount(values) as PaymentAccountDraft
      );
      dispatch(paymentsSlice.fetchPaymentAccounts(playerId));
      dispatch(dialogsSlice.closeDialog(DIALOG.ADD_PAYMENT_ACCOUNT));
      return newPaymentAccountId;
    } catch (error) {
      return formikActions.setFieldError("general", error.message);
    }
  };
