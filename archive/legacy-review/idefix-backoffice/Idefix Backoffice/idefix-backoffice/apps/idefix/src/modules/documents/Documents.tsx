import { FC } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";

import { KycDocument, LoadingIndicator } from "@idefix-backoffice/idefix/components";
import { useDocuments } from "./hooks";
import { DocumentsTable } from "./components/DocumentsTable";

const Documents: FC = () => {
  const { documents, activeDocuments, isLoading, handleEditDocument, showAll, handleSetShowAll } = useDocuments();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between">
        <Typography variant="subtitle2">Documents</Typography>
        <FormControlLabel control={<Switch checked={showAll} onChange={handleSetShowAll} />} label="Show all" />
      </Box>

      <Box mt={3}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
            <LoadingIndicator />
          </Box>
        ) : (
          activeDocuments?.map(activeDocument => (
            <Box key={activeDocument.id} display="flex" flexDirection="column" width={1} mb={3}>
              <KycDocument document={activeDocument} onEdit={handleEditDocument} visible={showAll} />
              <Box mt={3}>
                <Divider />
              </Box>
            </Box>
          ))
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: "500px",
          marginTop: 15,
          paddingBottom: 96
        }}
      >
        <DocumentsTable documents={documents} isLoading={isLoading} onEditDocument={handleEditDocument} />
      </Box>
    </Box>
  );
};

export { Documents };
