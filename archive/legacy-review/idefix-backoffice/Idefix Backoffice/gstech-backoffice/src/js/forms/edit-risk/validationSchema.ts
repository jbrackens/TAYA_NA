import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  type: Yup.string().required("Required"),
  fraudKey: Yup.string().required("Required"),
  points: Yup.number().required("Required"),
  maxCumulativePoints: Yup.number().required("Required"),
  requiredRole: Yup.string().required("Required"),
  active: Yup.boolean().required("Required"),
  name: Yup.string().required("Required"),
  title: Yup.string().required("Required"),
  description: Yup.string().required("Required"),
  manualTrigger: Yup.boolean().default(true),
});

export default validationSchema;
