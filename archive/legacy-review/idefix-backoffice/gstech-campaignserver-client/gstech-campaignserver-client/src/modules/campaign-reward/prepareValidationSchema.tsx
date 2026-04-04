import * as yup from "yup";
import reduce from "lodash/reduce";
import isNil from "lodash/isNil";

const titlesValidate = (titles: { [key: string]: { text: string; required?: boolean } }) =>
  reduce(
    Object.keys(titles),
    (acc, key) => ({
      ...acc,
      [key]: yup.object({ text: yup.string(), required: yup.boolean().optional() })
    }),
    {}
  );

export function prepareValidationSchema(titles: { [key: string]: { text: string; required?: boolean } }) {
  const schema = yup.object().shape({
    titles: yup.object(titlesValidate(titles)),
    trigger: yup.string().required(),
    minDeposit: yup.number().when("trigger", {
      is: "deposit",
      then: yup.number().min(0).required()
    }),
    maxDeposit: yup.number().when("trigger", {
      is: "deposit",
      then: yup.number().test("compare deposits", "maxDeposit must be more than minDeposit", function () {
        const { minDeposit, maxDeposit } = this.parent;

        if (!isNil(maxDeposit) && minDeposit >= maxDeposit) {
          return false;
        }

        return true;
      })
    }),
    reward: yup.object(),
    wager: yup.number().when("trigger", {
      is: "deposit",
      then: yup.number().min(0).required()
    }),

    quantity: yup.number().positive().required(),
    type: yup.string()
  });

  return schema;
}
