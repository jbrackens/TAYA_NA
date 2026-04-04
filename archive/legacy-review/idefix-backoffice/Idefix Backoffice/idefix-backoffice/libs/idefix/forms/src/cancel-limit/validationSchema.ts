import * as Yup from "yup";

const cancelLimitValidationSchema = Yup.object().shape({
  reason: Yup.string().required("Field is required")
});

export { cancelLimitValidationSchema };
