import * as Yup from "yup";

const askingForReasonValidationSchema = Yup.object().shape({
  reason: Yup.string().required("Field is required")
});

export { askingForReasonValidationSchema };
