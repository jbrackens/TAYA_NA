import * as Yup from "yup";
import isNumber from "lodash/isNumber";
import { isValidAmount } from "../validators";

const creditBonusValidationSchema = Yup.object().shape({
  bonus: Yup.string().required("Required"),
  amount: Yup.string()
    .required("Required")
    .test("amount", "Should be a valid amount", value => (value ? isValidAmount(value) : false))
    .test("amount", "Should be a positive", value => (isNumber(value) && value < 0 ? false : true))
    .nullable()
});

export { creditBonusValidationSchema };
