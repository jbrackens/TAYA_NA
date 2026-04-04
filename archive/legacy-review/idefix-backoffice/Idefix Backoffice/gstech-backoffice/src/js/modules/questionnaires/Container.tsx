import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Component from "./Component";
import { fetchQuestionnaires } from "./questionnairesSlice";
import { openDialog } from "../../dialogs";
import { RootState } from "js/rootReducer";

const Container = ({ playerId }: { playerId: number }) => {
  const dispatch = useDispatch();
  const { questionnaires, isFetchingQuestionnaires } = useSelector((state: RootState) => state.questionnaires);

  useEffect(() => {
    dispatch(fetchQuestionnaires(playerId));
  }, [dispatch, playerId]);

  const handleOpenDialog = useCallback(
    (answers: { key: string; question: string; answer: string }[], description: string) =>
      dispatch(openDialog("questionnaire-answers", { answers, description })),
    [dispatch],
  );

  return (
    <Component questionnaires={questionnaires} isLoading={isFetchingQuestionnaires} onOpenDialog={handleOpenDialog} />
  );
};

export default Container;
