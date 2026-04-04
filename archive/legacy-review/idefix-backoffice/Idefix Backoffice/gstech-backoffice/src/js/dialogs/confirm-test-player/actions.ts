import api from "../../core/api";
import { closeDialog } from "../";
import { updatePlayerDetails } from "../../modules/player-details";
import { AppDispatch } from "../../../index";
import { FormikHelpers } from "formik";
import { FormValues } from "./index";

interface Props {
  playerId: number;
  type: string;
  value: boolean;
  reason: string;
  formActions: FormikHelpers<FormValues>;
}

export const updateTestPlayer = ({ playerId, type, value, reason, formActions }: Props) => async (
  dispatch: AppDispatch,
) => {
  try {
    const player = await api.players.update(playerId, { [type]: value, reason });
    dispatch(updatePlayerDetails({ id: playerId, playerDetails: player }));
    dispatch(closeDialog("confirm-test-player"));
  } catch (error) {
    formActions.setFieldError("general", error.message);
  }
};
