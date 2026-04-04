import React from "react";
import { Field, Form, FormikProps } from "formik";
import Box from "@material-ui/core/Box";
import ButtonGroup from "../formik-fields/ButtonGroupField";
import AddKycDocuments from "../formik-fields/AddDocumentsField";
import Markdown from "../formik-fields/MarkdownField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import { FormValues } from "../../dialogs/add-documents";

const TYPE_BUTTONS = [
  { label: "Files", key: "photos" },
  { label: "Note", key: "content" },
];

const AddDocumentsForm = ({ formikProps }: { formikProps: FormikProps<FormValues> }) => {
  const { type } = formikProps.values;
  return (
    <Form>
      <Field component={ErrorMessageField} />

      <Box mt={2}>
        <Field name="type" component={ButtonGroup} buttons={TYPE_BUTTONS} />
      </Box>

      <Box mt={3}>
        {type === "photos" && <Field name="photos" component={AddKycDocuments} />}
        {type === "content" && <Field name="content" component={Markdown} />}
      </Box>
    </Form>
  );
};

export default AddDocumentsForm;
