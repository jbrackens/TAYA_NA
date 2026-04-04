import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  contentId: Yup.number().required()
});

export { validationSchema };
