import * as Yup from "yup";

const validationSchema = Yup.object()
  .shape({
    identification: Yup.boolean(),
    utility_bill: Yup.boolean(),
    source_of_wealth: Yup.boolean(),
    payment_method: Yup.number().when("verification", {
      is: true,
      then: Yup.number().required("Field is required"),
      otherwise: Yup.number().notRequired(),
    }),
  })
  .test("atLeastOne", "", values => {
    if (values.identification || values.utility_bill || values.source_of_wealth || values.payment_method) {
      return true;
    }

    return new Yup.ValidationError("select at least one of the documents", null);
  });

export default validationSchema;
