import pick from "lodash/pick";
import { CreditType, Reward } from "app/types";
import reduce from "lodash/reduce";
import filter from "lodash/filter";
import uniq from "lodash/uniq";

import { IRewardFormValues } from "./types";
import { formatToCents, formatToCurrency } from "../../utils/formatMoney";

export const CREDIT_TYPES: CreditType[] = ["freeSpins", "real", "bonus", "depositBonus"];
const FREESPINS_KEYS = ["spins", "spinValue", "spinType"];

export function getWidth(property: string) {
  switch (property) {
    case "description":
    case "bonusCode":
      return 90;
    case "game":
      return 50;
    default:
      return 30;
  }
}

export function formatReward({ reward, formFields }: { reward: IRewardFormValues; formFields: string[] }) {
  const { creditType, spinValue, ...restValues } = reward;

  let pickedKeys = formFields;
  if (creditType !== "freeSpins") {
    const uniqKeys = uniq([
      ...pickedKeys,
      "externalId",
      "creditType",
      "bonusCode",
      "cost",
      "price",
      "currency",
      "description",
      "active"
    ]);
    pickedKeys = uniqKeys.filter(key => !FREESPINS_KEYS.includes(key));
  }
  if (creditType === "freeSpins") {
    pickedKeys = [...pickedKeys, "gameId"];
  }

  const clearedPickedKeys = pickedKeys.filter(key => {
    const value = reward[key as keyof IRewardFormValues];

    if (key === "spinValue" && value === "") return true;
    if (value !== "") return true;

    return false;
  });

  const formattedReward = pick(
    {
      creditType,
      spinValue: spinValue ? spinValue : null,
      ...restValues
    },
    clearedPickedKeys
  );
  return formattedReward;
}

export const clearRewardValues = (values: IRewardFormValues) => {
  let clearedValues: Partial<IRewardFormValues> = values;
  const { creditType } = values;
  if (creditType !== "freeSpins") {
    clearedValues = { ...clearedValues, spinType: null, spins: null, spinValue: null };
  }
  if (creditType === "real" || creditType === "depositBonus") {
    clearedValues = { ...clearedValues, gameId: null };
  }
  return clearedValues;
};

export const getMoneyFields = (formFieldsInfo?: {
  [key: string]: {
    property: string;
    type: string;
    [key: string]: string | undefined;
  };
}) => filter(formFieldsInfo, ["type", "money"]).map(field => field?.property);

export const formatMoneyFieldsToCurrency = (reward: Reward, moneyFields: string[]) =>
  reduce(
    reward,
    (result, value, key) => {
      if (moneyFields.includes(key)) {
        return { ...result, [key]: formatToCurrency(Number(value)) };
      }
      return result;
    },
    {}
  );

export const formatMoneyFieldsToCents = (reward: Reward, moneyFields: string[]) =>
  reduce(
    reward,
    (result, value, key) => {
      if (moneyFields.includes(key)) {
        return { ...result, [key]: formatToCents(Number(value)) };
      }
      return result;
    },
    {}
  );

export const getPattern = (type: string) => {
  return type === "number" ? "^[0-9]*$" : type === "money" ? "^[0-9]*.?[0-9]{0,2}$" : undefined;
};
