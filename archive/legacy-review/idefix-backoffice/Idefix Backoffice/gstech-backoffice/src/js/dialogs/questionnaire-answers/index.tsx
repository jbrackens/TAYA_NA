import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { Questionnaire } from "app/types";
import Table, { Column } from "../../core/components/table";
import { closeDialog } from "../";
import { SOW_QUESTIONNAIRE_ANSWERS } from "js/core/constants";

interface Props {
  payload: Questionnaire;
  meta?: unknown;
}

const QuestionnaireAnswersDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();

  const handleClose = useCallback(() => dispatch(closeDialog("questionnaire-answers")), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <DialogTitle>{payload?.description || "Questionnaire"}</DialogTitle>
      <DialogContent>
        <Box minWidth="450px">
          {payload && payload.answers && (
            <Table initialData={payload.answers} isLoading={false}>
              <Column label="Question" name="question" align="left" type="text" />
              <Column
                label="Answer"
                name="answer"
                align="right"
                type="custom"
                format={(value, answer: { key: string; question: string; answer: string | null }) => {
                  return answer.answer && Object.keys(SOW_QUESTIONNAIRE_ANSWERS).includes(answer.answer)
                    ? SOW_QUESTIONNAIRE_ANSWERS[answer.answer as keyof typeof SOW_QUESTIONNAIRE_ANSWERS]
                    : answer.answer;
                }}
              />
            </Table>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={handleClose}>
          Ok
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuestionnaireAnswersDialog;
