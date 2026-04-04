import React, { FC, useCallback } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { Questionnaire, DIALOG } from "@idefix-backoffice/idefix/types";
import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { Table, Column } from "@idefix-backoffice/idefix/components";

interface Props {
  payload: Questionnaire;
  meta?: unknown;
}
// TODO update this to latest changes
const QuestionnaireAnswersDialog: FC<Props> = ({ payload }) => {
  const dispatch = useAppDispatch();

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.QUESTIONNAIRE_ANSWERS)), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <DialogTitle>{payload?.description || "Questionnaire"}</DialogTitle>
      <DialogContent>
        <Box minWidth="450px">
          {payload && payload.answers && (
            <Table initialData={payload.answers} isLoading={false}>
              <Column label="Question" name="question" align="left" type="text" />
              <Column label="Answer" name="answer" align="right" type="text" />
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

export { QuestionnaireAnswersDialog };
