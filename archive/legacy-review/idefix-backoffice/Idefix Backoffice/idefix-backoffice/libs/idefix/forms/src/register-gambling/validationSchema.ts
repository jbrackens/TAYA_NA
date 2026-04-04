import * as Yup from "yup";

const registerGamblingValidationSchema = Yup.object().shape({
  firstName: Yup.string().trim().required("Required"),
  lastName: Yup.string().trim().required("Required"),
  nationalId: Yup.string().optional().nullable(),
  dateOfBirth: Yup.date().optional().nullable(),
  mobilePhone: Yup.string().trim().optional().nullable(),
  email: Yup.string().email("Invalid email address").required("Required"),
  address: Yup.string().optional().nullable(),
  postCode: Yup.string().trim().optional().nullable(),
  city: Yup.string().trim().optional().nullable(),
  countryId: Yup.string().length(2).required("Required"),
  note: Yup.string().required("Required")
});

export { registerGamblingValidationSchema };
