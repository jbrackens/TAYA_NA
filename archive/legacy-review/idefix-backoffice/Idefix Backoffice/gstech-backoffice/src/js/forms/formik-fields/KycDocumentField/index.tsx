import React from "react";
import Box from "@material-ui/core/Box";
import RenderKycDocument from "../components/RenderKycDocument";
import { FieldProps } from "formik/dist/Field";

interface Props extends FieldProps {
  fileName: string;
}

const KycDocument = ({ field: { value }, fileName }: Props) => (
  <Box display="flex" alignItems="center" marginTop="20px" marginBottom="6px">
    {!!value && <RenderKycDocument id={value} fileName={fileName} />}
  </Box>
);

export default KycDocument;
