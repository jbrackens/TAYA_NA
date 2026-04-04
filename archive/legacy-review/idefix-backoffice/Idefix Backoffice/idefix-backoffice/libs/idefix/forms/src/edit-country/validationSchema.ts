import * as Yup from "yup";
import isNumber from "lodash/isNumber";

const editCountryValidationSchema = Yup.object().shape({
  name: Yup.string().required("Required"),
  minimumAge: Yup.string()
    .required("Required")
    .matches(/^[0-9]*$/, "Should be valid age")
    .test("minimumAge", "Should be valid age", value => (isNumber(value) && (value < 18 || value > 100) ? false : true))
    .nullable(),
  monthlyIncomeThreshold: Yup.string().max(15, "Monthly income threshold should be less").nullable()
});

export { editCountryValidationSchema };
