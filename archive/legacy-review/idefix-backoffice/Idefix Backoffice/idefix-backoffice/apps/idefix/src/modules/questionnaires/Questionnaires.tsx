import Box from "@mui/material/Box";
import { FC } from "react";
import { useQuestionnaires } from "./hooks";
import { QuestionnairesTable } from "./components/QuestionnairesTable";

const Questionnaires: FC = () => {
  const { questionnaires, isLoading, handleOpenDialog } = useQuestionnaires();

  return (
    <Box mt={3} paddingBottom={12}>
      <Box display="flex" flexDirection="column" minHeight="500px" flexGrow={1}>
        <QuestionnairesTable items={questionnaires} isLoading={isLoading} onOpenDialog={handleOpenDialog} />
      </Box>
    </Box>
  );
};

export { Questionnaires };
