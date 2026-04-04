import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Field is required"),
  wageringMultiplier: Yup.string()
    .required("Filed is required")
    .matches(/^[0-9]*$/, "Should be a positive integer number"),
});

export default validationSchema;
