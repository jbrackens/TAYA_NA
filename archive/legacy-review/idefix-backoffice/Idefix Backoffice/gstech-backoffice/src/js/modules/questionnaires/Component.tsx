import Box from "@material-ui/core/Box";
import QuestionnairesTable from "./components/QuestionnairesTable";
import { Questionnaire } from "app/types";

interface Props {
  questionnaires: Questionnaire[];
  isLoading: boolean;
  onOpenDialog: (answers: { key: string; question: string; answer: string }[], description: string) => void;
}

export default ({ questionnaires, isLoading, onOpenDialog }: Props) => {
  return (
    <Box mt={3} paddingBottom={12}>
      <Box display="flex" flexDirection="column" minHeight="500px" flexGrow={1}>
        <QuestionnairesTable items={questionnaires} isLoading={isLoading} onOpenDialog={onOpenDialog} />
      </Box>
    </Box>
  );
};
