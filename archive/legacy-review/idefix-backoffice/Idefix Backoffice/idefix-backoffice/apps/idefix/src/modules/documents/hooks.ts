import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { dialogsSlice, documentsSlice, useAppDispatch, useAppSelector } from "@idefix-backoffice/idefix/store";
import { Kyc, DIALOG } from "@idefix-backoffice/idefix/types";

export const useDocuments = () => {
  const dispatch = useAppDispatch();
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);
  const documents = useAppSelector(documentsSlice.getKycDocuments);
  const isLoading = useAppSelector(documentsSlice.getIsLoadingKycDocuments);
  const [showAll, setShowAll] = useState(false);
  const activeDocuments = documents?.filter(document => document?.status === "new" || document?.status === "checked");

  const handleEditDocument = useCallback(
    (document: Kyc) => () => {
      dispatch(dialogsSlice.openDialog(DIALOG.VIEW_PLAYER_DOCUMENT, { playerId, document }));
    },
    [dispatch, playerId]
  );

  const handleSetShowAll = useCallback(() => setShowAll(prev => !prev), []);

  useEffect(() => {
    if (playerId) {
      dispatch(documentsSlice.fetchKycDocuments(playerId));
    }
  }, [dispatch, playerId]);

  return { documents, activeDocuments, isLoading, handleEditDocument, showAll, handleSetShowAll };
};
