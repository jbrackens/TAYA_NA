import api from "../../core/api";
import { FormikHelpers } from "formik";
import { AccountDocument, PaymentAccountDraft } from "app/types";
import _ from "lodash";
import omit from "lodash/fp/omit";
import pick from "lodash/fp/pick";
// import isEmpty from "lodash/fp/isEmpty";
import { fetchPaymentAccounts } from "../../modules/payments";
import { AppDispatch } from "../../../index";
import { closeDialog } from "../";
import { FormValues } from "./";

const mapDocument = (document: AccountDocument) => ({
  ...omit(["formStatus"], document),
  content: document.content,
});

const compactObj = (obj: any) =>
  _.pickBy(obj, value => {
    return !(_.isNull(value) || _.isUndefined(value) || value === "" || (_.isArray(value) && _.isEmpty(value)));
  });

const mapAccount = (account: FormValues) => ({
  ...pick(["method", "account", "kycChecked"], account),
  // TODO check if this reduction in specificity when checking values in parameters is problematic
  parameters: account.parameters ? compactObj(account.parameters) : undefined,
  // parameters: account.parameters && !isEmpty(account.parameters.bic) ? account.parameters : undefined,
  documents: account.documents?.map(mapDocument),
});

interface Props {
  playerId: number;
  values: FormValues;
  formikActions: FormikHelpers<FormValues>;
}

export const addPaymentAccount =
  ({ playerId, values, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      const newPaymentAccountId = await api.players.addPaymentAccount(
        playerId,
        mapAccount(values) as PaymentAccountDraft,
      );
      dispatch(fetchPaymentAccounts(playerId));
      dispatch(closeDialog("add-payment-account"));
      return newPaymentAccountId;
    } catch (error) {
      formikActions.setFieldError("general", error.message);
    }
  };
