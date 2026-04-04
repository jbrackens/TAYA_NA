import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  code: Yup.string()
    .required("Code is required")
    .test("code", "Code must be a number", (value: string | undefined) => {
      if (isNaN(Number(value?.trim()))) {
        return false;
      }

      return true;
    })
    .test("code", "Code must have 6 digits", (value: string | undefined) => {
      if (value?.trim().length !== 6) {
        return false;
      }

      return true;
    })
});

export { validationSchema };
