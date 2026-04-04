import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  documentType: Yup.string().nullable().required("Document type is required"),
  accountId: Yup.mixed()
    .nullable()
    .test("isRequired", "Account id is required", (value, context) => {
      const { documentType } = context.parent;
      if (documentType === "payment_method" && value === null) {
        return false;
      } else {
        return true;
      }
    }),
});

export default validationSchema;
