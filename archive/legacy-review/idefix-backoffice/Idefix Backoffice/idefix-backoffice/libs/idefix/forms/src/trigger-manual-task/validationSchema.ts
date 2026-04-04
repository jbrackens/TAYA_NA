import * as Yup from "yup";

const triggerTaskValidationSchema = Yup.object().shape({
  fraudKey: Yup.string().required("Required"),
  note: Yup.string().optional(),
  checked: Yup.boolean().default(false)
});

export { triggerTaskValidationSchema };
