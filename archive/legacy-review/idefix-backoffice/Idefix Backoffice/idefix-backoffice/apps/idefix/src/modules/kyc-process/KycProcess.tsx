import Box from "@mui/material/Box";
import { FC } from "react";

import { LoadingIndicator } from "@idefix-backoffice/idefix/components";
import { useKycProcess } from "./useKycProcess";
import { KycForm } from "./components/kyc/Kyc";
import "./style.css";

const KycProcess: FC = () => {
  const { document, isLoadingDocument, accounts } = useKycProcess();
  return (
    <Box>
      {isLoadingDocument ? (
        <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
          <LoadingIndicator />
        </Box>
      ) : (
        <Box>{document && <KycForm document={document} accounts={accounts} />}</Box>
      )}
    </Box>
  );
};

export { KycProcess };
