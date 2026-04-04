import * as Yup from "yup";
import mapValues from "lodash/fp/mapValues";

const validationSchema = Yup.object().shape({
  blockCountries: Yup.boolean(),
  deposits: Yup.boolean(),
  withdrawals: Yup.boolean(),
  brands: Yup.lazy(obj => {
    if (typeof obj === "object") {
      return Yup.object(
        mapValues(() => {
          return Yup.object({
            selectedCurrencies: Yup.array().of(
              Yup.object().shape({
                id: Yup.string().required("Required").nullable(),
                maxPendingDeposits: Yup.number().nullable(true).notRequired(),
              }),
            ),
          });
        }, obj),
      );
    }
    return Yup.mixed().notRequired();
  }),
});

export const validateCountry = (value: string[], blockCountries: boolean) => {
  if (blockCountries === false && value.length === 0) {
    return "Required";
  }
};

export const validateMinDeposit = ({
  value,
  maxDeposit,
  showDeposits,
}: {
  value: string | number;
  maxDeposit: string | number;
  showDeposits: boolean;
}) => {
  if (showDeposits && value === null) {
    return "Required";
  }

  if (showDeposits && value !== 0 && value >= maxDeposit) {
    return "Should be less than max";
  }
};

export const validateMaxDeposit = ({
  value,
  minDeposit,
  showDeposits,
}: {
  value: string | number;
  minDeposit: string | number;
  showDeposits: boolean;
}) => {
  if (showDeposits && value === null) {
    return "Required";
  }

  if (showDeposits && value !== 0 && value <= minDeposit) {
    return "Should me greater than min";
  }
};

export const validateMinWithdrawal = ({
  value,
  maxWithdrawal,
  showWithdrawals,
}: {
  value: string | number;
  maxWithdrawal: string | number;
  showWithdrawals: boolean;
}) => {
  if (showWithdrawals && value === null) {
    return "Required";
  }

  if (showWithdrawals && value !== 0 && value >= maxWithdrawal) {
    return "Should be less than max";
  }
};

export const validateMaxWithdrawal = ({
  value,
  minWithdrawal,
  showWithdrawals,
}: {
  value: string | number;
  minWithdrawal: string | number;
  showWithdrawals: boolean;
}) => {
  if (showWithdrawals && value === null) {
    return "Required";
  }

  if (showWithdrawals && value !== 0 && value <= minWithdrawal) {
    return "Should me greater than min";
  }
};

export default validationSchema;
