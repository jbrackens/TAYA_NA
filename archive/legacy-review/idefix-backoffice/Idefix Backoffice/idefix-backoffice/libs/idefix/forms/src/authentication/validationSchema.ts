import * as Yup from "yup";

const authenticationValidationSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email address").required("Email is required"),
  password: Yup.string().min(8, "Password should contain at least 12 characters").required("Password is required")
});

export { authenticationValidationSchema };
