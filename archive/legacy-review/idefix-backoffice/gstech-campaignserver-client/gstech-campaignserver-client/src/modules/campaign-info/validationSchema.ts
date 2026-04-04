import * as Yup from "yup";

export const validationSchema = Yup.object().shape({
  name: Yup.string().required(),
  startTime: Yup.date().nullable().default(null),
  endTime: Yup.date().min(Yup.ref("startTime"), "End time must be later than Start time").nullable().default(null)
});
