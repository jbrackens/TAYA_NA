import * as Yup from "yup";
import { isValidMobilePhone } from "../validators";

const userDetailsValidationSchema = Yup.object().shape({
  name: Yup.string().required("Required"),
  handle: Yup.string().required("Required"),
  email: Yup.string().email("Invalid email address").required("Required"),
  mobilePhone: Yup.string()
    .required("Required")
    .test("phone", "Invalid mobilePhone", value => (value ? isValidMobilePhone(value) : false))
});

export { userDetailsValidationSchema };
