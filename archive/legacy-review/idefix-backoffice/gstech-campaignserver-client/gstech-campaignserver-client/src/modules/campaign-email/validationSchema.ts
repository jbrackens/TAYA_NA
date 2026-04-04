import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  sendingTime: Yup.string().nullable().default(null),
  contentId: Yup.number().required()
});

export { validationSchema };
