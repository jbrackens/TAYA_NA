import React, { FC, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { getRoles } from "../../modules/app";
import { AccountSuspendForm } from "../../forms/account-suspend";
import { closeDialog } from "../";
import { proceed } from "./actions";
import { SuspendReason } from "app/types";

export type FormValues = {
  flag_gambling_problem: boolean;
  flag_multiple: boolean;
  flag_fake: boolean;
  flag_fraudulent: boolean;
  flag_suspicious: boolean;
  flag_ipcountry: boolean;
  flag_data_removal: boolean;
  accountClosed: boolean;
  note: string;
};

interface Props {
  payload: {
    playerId: number;
    value: boolean;
  };
  meta?: unknown;
}

const AccountSuspendDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const { playerId } = payload;
  const userRoles = useSelector(getRoles);
  const isRiskManagerRole = userRoles?.includes("riskManager");

  const handleSubmit = useCallback(
    (values: FormValues, formikActions: FormikHelpers<FormValues>) => {
      const reasons = Object.entries(values)
        .filter(([key, value]) => value && key.indexOf("flag_") === 0)
        .map(([key]) => key.substring(5)) as SuspendReason[];

      dispatch(
        proceed({
          playerId,
          reasons,
          note: values.note,
          accountClosed: values.accountClosed,
          formikActions,
        }),
      );
    },
    [dispatch, playerId],
  );

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("account-suspend")), [dispatch]);

  const initialValues: FormValues = useMemo(
    () => ({
      flag_gambling_problem: false,
      flag_multiple: false,
      flag_fake: false,
      flag_fraudulent: false,
      flag_suspicious: false,
      flag_ipcountry: false,
      flag_data_removal: false,
      accountClosed: false,
      note: "",
    }),
    [],
  );

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik initialValues={initialValues} onSubmit={handleSubmit}>
        {props => (
          <>
            <DialogTitle>Close account</DialogTitle>
            <DialogContent>
              <AccountSuspendForm isRiskManagerRole={isRiskManagerRole} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} color="primary">
                Cancel
              </Button>
              <Button type="submit" onClick={props.submitForm} disabled={props.isSubmitting} color="primary">
                Proceed
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default AccountSuspendDialog;
