import { FormikHelpers } from "formik";
import { useCallback, useMemo } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { LimitType, DIALOG } from "@idefix-backoffice/idefix/types";

import { setLimit } from "./actions";

interface Payload {
  type: LimitType;
  playerId: number;
}

const useSetLimit = (payload: Payload) => {
  const dispatch = useAppDispatch();

  const handleSetLimit = useCallback(
    ({ limit, period, isInternal, ...rest }: any, formikActions: FormikHelpers<any>) => {
      const { type, playerId } = payload;

      const values = {
        limit: limit || undefined,
        period: period || undefined,
        isInternal: !isInternal,
        ...rest
      };
      dispatch(setLimit(playerId, type, values, formikActions));
    },
    [dispatch, payload]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.SET_LIMIT)), [dispatch]);

  const initialValues = useMemo(() => ({ limit: "", isInternal: true, reason: "", duration: "", period: "" }), []);

  return { handleSetLimit, handleClose, initialValues };
};

export { useSetLimit };
