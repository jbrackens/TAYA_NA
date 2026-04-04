import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  counterTarget: Yup.string()
    .required("Required")
    .test("counterTarget", "Wagering requirement must be a number", value => {
      if (Number.isNaN(Number(value))) {
        return false;
      }

      return true;
    })
    .test("counterTarget", "Wagering requirement must be positive", value => {
      if (Number(value) >= 0) {
        return true;
      }
      return false;
    }),
});

export default validationSchema;
