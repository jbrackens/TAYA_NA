import React, { FC, useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { closeDialog } from "../";
import { uploadNewDocument } from "./actions";
import { fetchPaymentAccounts } from "../../modules/payments";
import { validationSchema, ViewPlayerDocumentForm } from "../../forms/view-player-document";
import { RootState } from "js/rootReducer";
import { DocumentDraft, Kyc } from "app/types";

interface Props {
  payload: { playerId: number; document: Kyc };
  meta?: unknown;
}

const ViewPlayerDocument: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const accounts = useSelector((state: RootState) => state.payments.accounts);
  const { document, playerId } = payload;
  const { id } = document;

  useEffect(() => {
    dispatch(fetchPaymentAccounts(playerId));
  }, [dispatch, playerId]);

  const handleSubmit = useCallback(
    (
      { type, photoId, expiryDate, content, accountId, documentType, fields }: Kyc,
      formikActions: FormikHelpers<Kyc>,
    ) => {
      const playerDocumentDraft = {
        photoId: type === "photo" && photoId ? photoId : null,
        expiryDate,
        fields: fields,
        content: type === "content" && content && content !== "" ? content : null,
        type: documentType,
        accountId: documentType === "payment_method" ? accountId : null,
      } as DocumentDraft;

      dispatch(uploadNewDocument(playerId, id, playerDocumentDraft, formikActions));
    },
    [dispatch, playerId, id],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("view-player-document")), [dispatch]);

  const initialValues: Kyc = useMemo(() => {
    return (
      payload && {
        ...payload.document,
        expiryDate: payload.document && payload.document.expiryDate && new Date(payload.document.expiryDate),
        fields: payload.document && payload.document.fields,
        content: payload.document && payload.document.content,
        type: payload.document && payload.document.content ? "content" : "photo",
        documentType: payload.document && payload.document.documentType,
        accountId: payload.document && payload.document.accountId,
      }
    );
  }, [payload]);

  return (
    <Dialog open={true} maxWidth="md" onClose={handleClose} transitionDuration={0}>
      <Formik onSubmit={handleSubmit} validationSchema={validationSchema} initialValues={initialValues}>
        {props => (
          <>
            <DialogTitle>Document</DialogTitle>
            <DialogContent>
              <ViewPlayerDocumentForm accounts={accounts} formikProps={props} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
                color="primary"
              >
                Save
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default ViewPlayerDocument;
