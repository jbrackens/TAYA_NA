import { useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";

import { dialogsSlice, questionnairesSlice, useAppDispatch, useAppSelector } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

export const useQuestionnaires = () => {
  const dispatch = useAppDispatch();
  const questionnaires = useAppSelector(questionnairesSlice.getQuestionnaires);
  const isLoading = useAppSelector(questionnairesSlice.getIsLoadingQuestionnaires);
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);

  const handleOpenDialog = useCallback(
    (answers: { key: string; question: string; answer: string }[], description: string) => {
      dispatch(dialogsSlice.openDialog(DIALOG.QUESTIONNAIRE_ANSWERS, { answers, description }));
    },
    [dispatch]
  );

  useEffect(() => {
    dispatch(questionnairesSlice.fetchQuestionnaires(playerId));
  }, [dispatch, playerId]);

  return { questionnaires, isLoading, handleOpenDialog };
};
