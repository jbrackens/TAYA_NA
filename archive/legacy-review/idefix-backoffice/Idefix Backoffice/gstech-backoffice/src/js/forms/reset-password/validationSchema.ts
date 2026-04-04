import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  newPassword: Yup.string()
    .required("New password is required")
    .min(12, "Password should contain at least 12 characters")
    .matches(/[A-Z/]/, "Password should contain uppercase letter")
    .matches(/[a-z/]/, "Password should contain lowercase letter")
    .matches(/[0-9!@#$%^&*-:\\;/]/, "Password should contain number or special character"),
  confirmPassword: Yup.string()
    .required("Confirm password is required")
    .oneOf([Yup.ref("newPassword"), null], "Should match new password"),
});

export default validationSchema;
