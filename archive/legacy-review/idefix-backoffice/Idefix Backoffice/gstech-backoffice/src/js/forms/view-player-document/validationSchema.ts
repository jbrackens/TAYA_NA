import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  documentType: Yup.string().required("You must select the document type").nullable(),
  accountId: Yup.string().when("documentType", {
    is: (value: string) => value === "payment_method",
    then: Yup.string().required("Field is required").nullable(),
    otherwise: Yup.string().notRequired().nullable(),
  }),
});

export default validationSchema;
