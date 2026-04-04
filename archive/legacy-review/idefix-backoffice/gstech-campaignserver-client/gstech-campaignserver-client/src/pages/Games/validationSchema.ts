import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  name: Yup.string().required(),
  permalink: Yup.string().required(),
  manufacturer: Yup.string(),
  active: Yup.boolean().required(),
  primaryCategory: Yup.string().required(),
  thumbnailId: Yup.number().nullable(),
  newGame: Yup.boolean().required(),
  jackpot: Yup.boolean().required(),
  searchOnly: Yup.boolean().required(),
  keywords: Yup.string(),
  viewMode: Yup.string(),
  tags: Yup.array()
});

export { validationSchema };
