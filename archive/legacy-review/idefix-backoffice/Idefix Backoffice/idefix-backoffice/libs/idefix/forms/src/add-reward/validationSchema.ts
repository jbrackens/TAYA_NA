import * as Yup from "yup";

const addRewardValidationSchema = Yup.object().shape({
  count: Yup.number().positive().required("Field is required"),
  rewardId: Yup.number().required("Field is required").nullable()
});

export { addRewardValidationSchema };
