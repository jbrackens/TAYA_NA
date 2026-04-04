import { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import find from "lodash/fp/find";
import isEmpty from "lodash/fp/isEmpty";
import { FormikHelpers } from "formik";

import {
  useAppDispatch,
  useAppSelector,
  kycProcessSlice,
  paymentsSlice,
  dialogsSlice
} from "@idefix-backoffice/idefix/store";
import { AccountActive, DIALOG, Kyc } from "@idefix-backoffice/idefix/types";
import { KycProcessFormValues } from "@idefix-backoffice/idefix/forms";

export const useKycProcess = () => {
  const dispatch = useAppDispatch();
  const document = useAppSelector(kycProcessSlice.getDocument);
  const isLoadingDocument = useAppSelector(kycProcessSlice.getIsLoadingDocument);
  const accounts = useAppSelector(paymentsSlice.getAccounts);
  const isLoadingAccounts = useAppSelector(paymentsSlice.getIsLoadingAccounts);
  const params = useParams<{ playerId: string; kycDocumentId: string }>();
  const playerId = Number(params.playerId);
  const documentId = Number(params.kycDocumentId);

  useEffect(() => {
    dispatch(kycProcessSlice.dropState());

    if (playerId) {
      dispatch(kycProcessSlice.fetchKycDocument({ playerId, documentId }));
      dispatch(paymentsSlice.fetchPaymentAccounts(playerId));
    }
  }, [dispatch, documentId, playerId]);

  return {
    document,
    isLoadingDocument,
    accounts,
    isLoadingAccounts
  };
};
