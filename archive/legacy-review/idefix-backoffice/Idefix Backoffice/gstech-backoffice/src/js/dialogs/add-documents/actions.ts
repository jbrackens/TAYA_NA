import api from "../../core/api";
import { changePlayerTab, updatePlayerList } from "../../modules/sidebar";
import { fetchPlayer } from "../../modules/player";
import { closeDialog } from "../";
import { fetchKycDocuments } from "../../modules/documents";
import { FormValues } from "./";
import { FormikHelpers } from "formik";
import { AppDispatch } from "../../../index";

interface Props {
  playerId: number;
  values: FormValues;
  formikActions: FormikHelpers<FormValues>;
}

export const addDocuments = ({ playerId, values, formikActions }: Props) => async (dispatch: AppDispatch) => {
  const { type, content, photos } = values;

  try {
    const docs =
      type === "photos"
        ? photos && (await api.kyc.create(playerId, photos))
        : content && (await api.kyc.createContent(playerId, content));
    dispatch(updatePlayerList());
    dispatch(fetchPlayer(playerId));
    dispatch(fetchKycDocuments(playerId));
    if (docs && docs.length > 0) {
      dispatch(changePlayerTab(playerId, `tasks/kyc/${docs[0].id}`));
    }
    dispatch(closeDialog("add-documents"));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
  }
};
