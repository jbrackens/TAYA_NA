import * as Yup from "yup";
import isNil from "lodash/isNil";

const limitSchema = Yup.object().shape({
  minAmount: Yup.number().min(0, "Should be a positive integer").nullable(),
  maxAmount: Yup.number().min(0, "Should be a positive integer").nullable(),
});

const limitSchemaRequired = Yup.object().shape({
  minAmount: Yup.number()
    .min(0, "Should be a positive integer")
    .test("maxAmount", "Should be less or equal to maximum", (value, context) => {
      const { maxAmount } = context.parent;

      if (isNil(value)) return true;
      if (!maxAmount) return true;

      return value > maxAmount ? false : true;
    })
    .nullable()
    .required("Required"),
  maxAmount: Yup.number()
    .min(0, "Should be a positive integer")
    .test("minAmount", "Should be bigger or equal to minimum", (value, context) => {
      const { minAmount } = context.parent;

      if (isNil(value)) return true;
      return value < minAmount ? false : true;
    })
    .nullable()
    .required("Required"),
});

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Required"),

  wageringRequirementMultiplier: Yup.number().typeError("Should be a number").required("Required"),

  daysUntilExpiration: Yup.number()
    .typeError("Should be a number")
    .min(1, "Should be a positive integer")
    .required("Required"),

  depositBonus: Yup.boolean(),

  depositCount: Yup.number()
    .nullable()
    .when("depositBonus", {
      is: true,
      then: Yup.number().typeError("Should be a number").required("Required"),
    }),

  depositMatchPercentage: Yup.number()
    .nullable()
    .when("depositBonus", {
      is: true,
      then: Yup.number().typeError("Should be a number").required("Required"),
    }),

  limits: Yup.array()
    .of(limitSchema)
    .when("depositBonus", {
      is: true,
      then: Yup.array().of(limitSchemaRequired),
    }),
});

export default validationSchema;
