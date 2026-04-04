import * as Yup from "yup";

const changePasswordValidationSchema = Yup.object().shape({
  oldPassword: Yup.string().required("Password is required").min(8, "Password should contain at least 8 characters"),
  newPassword: Yup.string()
    .required("Password is required")
    .notOneOf([Yup.ref("oldPassword"), null], "Unable to set old password again")
    .min(12, "Password should contain at least 12 characters")
    .matches(/[A-Z/]/, "Password should contain uppercase letter")
    .matches(/[a-z/]/, "Password should contain lowercase letter")
    .matches(/[0-9!@#$%^&*-:\\;/]/, "Password should contain number or special character"),
  confirmPassword: Yup.string()
    .required("Password is required")
    .oneOf([Yup.ref("newPassword"), null], "Should match new password")
});

export { changePasswordValidationSchema };
