import React, { FC } from "react";
import { Field, Form, FormikProps } from "formik";
import Box from "@mui/material/Box";

import { ButtonGroupField } from "../formik-fields/ButtonGroupField";
import { AddKycDocuments } from "../formik-fields/AddDocumentsField";
import { MarkdownField } from "../formik-fields/MarkdownField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";
import { AddDocumentsFormValues } from "./types";

const TYPE_BUTTONS = [
  { label: "Files", key: "photos" },
  { label: "Note", key: "content" }
];

interface Props {
  formikProps: FormikProps<AddDocumentsFormValues>;
}

const AddDocumentsForm: FC<Props> = ({ formikProps }) => {
  const { type } = formikProps.values;
  return (
    <Form>
      <Field component={ErrorMessageField} />

      <Box mt={2}>
        <Field name="type" component={ButtonGroupField} buttons={TYPE_BUTTONS} />
      </Box>

      <Box mt={3}>
        {type === "photos" && <Field name="photos" component={AddKycDocuments} />}
        {type === "content" && <Field name="content" component={MarkdownField} />}
      </Box>
    </Form>
  );
};

export { AddDocumentsForm };
