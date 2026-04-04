import * as Yup from "yup";
import { isValidMobilePhone } from "../validators";

const mobilePhoneCheck = /^(\+\d{1,3}[- ]?)?\d{7,11}$/;

const playerDetailsFormValidationSchema = Yup.object().shape({
  postCode: Yup.string().required("Required").max(15, "Invalid post code"),
  email: Yup.string().email("Invalid email").required("Required"),
  mobilePhone: Yup.string()
    .required("Required")
    .matches(mobilePhoneCheck, "Not a valid mobile phone number")
    .test("phone", "Not a valid mobile phone number", value => (value ? isValidMobilePhone(value) : false))
});

export { playerDetailsFormValidationSchema };
