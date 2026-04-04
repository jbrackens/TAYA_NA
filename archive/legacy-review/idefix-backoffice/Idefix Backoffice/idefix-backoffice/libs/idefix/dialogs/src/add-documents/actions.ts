import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, sidebarSlice, playerSlice, documentsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { AddDocumentsFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  playerId: number;
  values: AddDocumentsFormValues;
  formikActions: FormikHelpers<AddDocumentsFormValues>;
}

const addDocuments =
  ({ playerId, values, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    const { type, content, photos } = values;

    try {
      const docs =
        type === "photos"
          ? photos && (await api.kyc.create(playerId, photos))
          : content && (await api.kyc.createContent(playerId, content));

      dispatch(sidebarSlice.updatePlayerList());
      dispatch(playerSlice.fetchPlayer(playerId));
      dispatch(documentsSlice.fetchKycDocuments(playerId));

      if (docs && docs.length > 0) {
        dispatch(sidebarSlice.changePlayerTab(playerId, `tasks/kyc/${docs[0].id}`));
      }
      dispatch(dialogsSlice.closeDialog(DIALOG.ADD_DOCUMENTS));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
    }
  };

export { addDocuments };
