import * as Yup from "yup";

const confirmWdValidationSchema = Yup.object().shape({
  externalTransactionId: Yup.string().required("Required")
});

export { confirmWdValidationSchema };
