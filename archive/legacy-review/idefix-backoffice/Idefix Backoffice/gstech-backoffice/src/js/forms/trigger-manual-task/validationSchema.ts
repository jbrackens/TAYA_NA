import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  fraudKey: Yup.string().required("Required"),
  note: Yup.string().optional(),
  checked: Yup.boolean().default(false),
});

export default validationSchema;
