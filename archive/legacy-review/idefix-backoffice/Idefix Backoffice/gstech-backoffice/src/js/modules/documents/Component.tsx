import React from "react";
import Box from "@material-ui/core/Box";
import { makeStyles } from "@material-ui/styles";
import { Kyc } from "app/types";
import Divider from "@material-ui/core/Divider/Divider";

import { DocumentItem, DocumentsTable } from "./components";
import Loading from "../../core/components/Loading";

const useStyles = makeStyles({
  documents: {
    display: "flex",
    flexDirection: "column",
    padding: 24,
  },
  documentsTable: {
    height: "100%",
    minHeight: "500px",
    display: "flex",
    flexDirection: "column",
    marginTop: 15,
    paddingBottom: 96,
  },
  documentsGalleryContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
});

interface Props {
  documents: Kyc[];
  isLoading: boolean;
  onEditDocument: (document: Kyc) => void;
}

export default ({ documents, isLoading, onEditDocument }: Props) => {
  const classes = useStyles();
  const activeDocuments = documents?.filter(document => document?.status === "new" || document?.status === "checked");

  return (
    <Box className={classes.documents}>
      <Box className={classes.documentsGalleryContainer}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100px">
            <Loading />
          </Box>
        ) : (
          activeDocuments?.map(activeDocument => (
            <Box key={activeDocument.id} display="flex" flexDirection="column" width={1} mb={3}>
              <DocumentItem activeDocument={activeDocument} onEditDocument={onEditDocument} />
              <Box mt={3}>
                <Divider light />
              </Box>
            </Box>
          ))
        )}
      </Box>

      <Box className={classes.documentsTable}>
        <DocumentsTable documents={documents} isLoading={isLoading} onEditDocument={onEditDocument} />
      </Box>
    </Box>
  );
};
