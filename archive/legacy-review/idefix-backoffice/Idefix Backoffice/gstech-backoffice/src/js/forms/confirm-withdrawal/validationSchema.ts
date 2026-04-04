import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  externalTransactionId: Yup.string().required("Required"),
});

export default validationSchema;
