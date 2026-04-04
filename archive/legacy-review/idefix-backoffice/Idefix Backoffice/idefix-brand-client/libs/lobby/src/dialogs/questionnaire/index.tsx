import * as React from "react";
import { useRegistry } from "@brandserver-client/ui";
import PEP from "./PEP";
import SOW from "./SOW";
import GNRS from "./GNRS";
import TransferQuestioner from "./transfer";
import ResponsibleGaming from "./ResponsibleGaming";
import CompleteRegistration from "./CompleteRegistration";
import { useLockBodyScroll } from "@brandserver-client/hooks";

interface Props {
  requiredQuestionnaires: string[];
  onSubmitQuestionnaire: (id: string, data: Record<string, unknown>) => any;
}

const Questionnaire: React.FC<Props> = ({
  onSubmitQuestionnaire,
  requiredQuestionnaires
}) => {
  const { FullScreenModal } = useRegistry();
  useLockBodyScroll(true);

  return (
    <FullScreenModal showCloseButton={false}>
      {requiredQuestionnaires[0] === "PNP_Complete" && (
        <CompleteRegistration onSubmit={onSubmitQuestionnaire} />
      )}
      {requiredQuestionnaires[0] === "PEP" && (
        <PEP onSubmit={onSubmitQuestionnaire} />
      )}
      {requiredQuestionnaires[0] === "SOW" && (
        <SOW onSubmit={onSubmitQuestionnaire} />
      )}
      {requiredQuestionnaires[0] === "GNRS_limits" && (
        <GNRS onSubmit={onSubmitQuestionnaire} />
      )}
      {requiredQuestionnaires[0] === "Transfer" && (
        <TransferQuestioner onSubmit={onSubmitQuestionnaire} />
      )}
      {requiredQuestionnaires[0].includes("Total_Deposits_") && (
        <ResponsibleGaming
          onSubmit={onSubmitQuestionnaire}
          questionnaireKey={requiredQuestionnaires[0]}
        />
      )}
    </FullScreenModal>
  );
};

export default Questionnaire;
