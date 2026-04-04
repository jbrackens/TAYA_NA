import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  reason: Yup.string().required("Field is required"),
})

export default validationSchema;