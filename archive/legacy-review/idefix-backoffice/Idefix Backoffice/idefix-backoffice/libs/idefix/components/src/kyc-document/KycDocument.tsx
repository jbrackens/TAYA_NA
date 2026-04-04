import { FC, useCallback, useEffect, useState } from "react";
import { marked } from "marked";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

import { Kyc } from "@idefix-backoffice/idefix/types";

import { RenderDocument } from "./RenderDocument";

const DOCUMENT_TYPES = {
  identification: "Identification",
  source_of_wealth: "Source of Wealth",
  payment_method: "Payment method",
  utility_bill: "Utility bill",
  other: "Other"
};

interface Props {
  document: Kyc;
  onEdit: (document: Kyc) => () => void;
  visible?: boolean;
}

const KycDocument: FC<Props> = ({ document, onEdit, visible = false }) => {
  const [isVisible, setIsVisible] = useState(visible);

  const handleChange = useCallback(() => setIsVisible(prev => !prev), []);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography>{document.name ? document.name : `Content #${document.id}`}</Typography>
        <Box>
          <Button onClick={onEdit(document)}>Edit</Button>
          <Button onClick={handleChange} sx={{ marginLeft: 1 }}>
            {isVisible ? "Hide" : "Show"}
          </Button>
        </Box>
      </Box>
      {document.documentType && <Typography>Type: {DOCUMENT_TYPES[document.documentType]}</Typography>}
      {document.documentType && document.documentType === "payment_method" && (
        <Typography>
          Account: {document.type || ""} {document.account || ""}
        </Typography>
      )}
      <Collapse in={isVisible}>
        {document.content && <div dangerouslySetInnerHTML={{ __html: marked(document.content) }} />}
        {document.photoId && <RenderDocument document={document} />}
      </Collapse>
    </Box>
  );
};

export { KycDocument };
