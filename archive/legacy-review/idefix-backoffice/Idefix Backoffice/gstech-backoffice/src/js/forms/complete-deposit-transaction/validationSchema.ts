import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  reason: Yup.string().required("Reason is required"),
  transactionId: Yup.string().required("TransactionId is required"),
});

export default validationSchema;


