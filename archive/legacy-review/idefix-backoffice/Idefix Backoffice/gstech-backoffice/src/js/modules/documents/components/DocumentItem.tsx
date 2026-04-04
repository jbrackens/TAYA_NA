import React, { FC } from "react";
import Box from "@material-ui/core/Box";
import { makeStyles } from "@material-ui/styles";
import { Kyc } from "app/types";
import { marked } from "marked";
import RenderKycDocument from "../../../forms/formik-fields/components/RenderKycDocument";
import { Typography } from "@material-ui/core";
import Button from "@material-ui/core/Button";

const useStyles = makeStyles({
  photoContainer: {
    maxWidth: 800,
  },
  pdfPhoto: {
    maxWidth: 800,
    height: 500,
  },
  photo: {
    height: 500,
  },
  documentsGalleryItem: {
    width: "100%",
  },
  cardTitle: {
    fontSize: 15,
  },
  markdownPreview: {
    maxWidth: 800,
  },
  documentInfo: {
    display: "flex",
    justifyContent: "space-between",
  },
});

const types = {
  identification: "Identification",
  utility_bill: "Utility bill",
  source_of_wealth: "Source of Wealth",
  payment_method: "Payment method",
  other: "Other",
};

interface Props {
  activeDocument: Kyc;
  onEditDocument: (document: Kyc) => void;
}

const DocumentItem: FC<Props> = ({ activeDocument, onEditDocument }) => {
  const classes = useStyles();

  return (
    <Box className={classes.documentsGalleryItem}>
      <Box display="flex" justifyContent="space-between">
        <Typography variant="subtitle2">
          Document: {activeDocument?.name ? activeDocument.name : `Content #${activeDocument?.id}`}
        </Typography>
        <Button onClick={() => onEditDocument(activeDocument)}>Edit</Button>
      </Box>

      <Box>
        <Box display="flex" mt={3} mb={3}>
          {activeDocument?.photoId && (
            <RenderKycDocument
              id={activeDocument?.photoId || ""}
              fileName={activeDocument?.name || ""}
              photoContainerClassName={classes.photoContainer}
              pdfPhotoClassName={classes.pdfPhoto}
              photoClassName={classes.photo}
            />
          )}
          {activeDocument?.content && (
            <Box className={classes.markdownPreview}>
              <div dangerouslySetInnerHTML={{ __html: marked(activeDocument.content) }} />
            </Box>
          )}
        </Box>
        <Box className={classes.documentInfo}>
          {activeDocument?.documentType && (
            <span>
              <strong>Type</strong>: {types[activeDocument.documentType]}
            </span>
          )}
          {activeDocument?.documentType && activeDocument?.documentType === "payment_method" && (
            <span>
              <strong>Account</strong>: {activeDocument?.type || ""} {activeDocument?.account || ""}
            </span>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export { DocumentItem };
