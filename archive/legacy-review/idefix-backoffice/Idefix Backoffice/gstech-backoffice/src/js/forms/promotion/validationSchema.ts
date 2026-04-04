import * as Yup from "yup";
import isNumber from "lodash/isNumber";

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Field is required"),
  multiplier: Yup.string()
    .required("Field is required")
    .test("multiplier", "Should be a positive", value => (isNumber(value) && Number(value) < 0 ? false : true))
    .matches(/^[0-9]+$/, "Should be a integer number"),
  minimumContribution: Yup.string().required("Field is required").nullable(),
});

export default validationSchema;
