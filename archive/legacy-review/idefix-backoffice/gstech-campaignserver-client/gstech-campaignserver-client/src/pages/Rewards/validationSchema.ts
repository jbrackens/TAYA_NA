import * as Yup from "yup";
import { CreditType, RewardsConfigField } from "app/types";

import { CREDIT_TYPES } from "./utils";
import { RewardFormGamesSelectOption } from "./types";

const metadataValidate = (fields: RewardsConfigField[]) =>
  fields.reduce((acc, field) => {
    const { property, required } = field;

    if (property.includes("metadata")) {
      const metadataProperty = property.replace("metadata.", "");

      return acc.shape({
        [metadataProperty]: required ? Yup.string().required() : Yup.string()
      });
    } else return acc;
  }, Yup.object());

export const createValidationSchema = (fields: RewardsConfigField[], games: RewardFormGamesSelectOption[]) => {
  const schema = Yup.object().shape({
    externalId: Yup.string().required(),
    creditType: Yup.string().required().oneOf(CREDIT_TYPES),
    gameId: Yup.mixed().when("creditType", {
      is: "freeSpins",
      then: Yup.number().required(),
      otherwise: Yup.number().nullable()
    }),
    bonusCode: Yup.mixed()
      .when("creditType", {
        is: (creditType: CreditType) => creditType === "freeSpins" || creditType === "bonus" || creditType === "real",
        then: Yup.string().required(),
        otherwise: Yup.string()
      })
      .when("gameId", (gameId: number, schema) => {
        const { manufacturer } = games.find(game => game.value === gameId) || {};
        if (manufacturer === "Evolution") return schema.required().max(40);
        return schema;
      }),
    description: Yup.string().required(),
    cost: Yup.string(),
    spins: Yup.string()
      .when("creditType", {
        is: "freeSpins",
        then: Yup.string().required()
      })
      .nullable(),
    spinType: Yup.string()
      .when("gameId", (gameId: number, schema) => {
        const { manufacturer } = games.find(game => game.value === gameId) || {};
        if (manufacturer === "Evolution") return schema.required();
        return schema.nullable().notRequired();
      })
      .when("creditType", {
        is: "freeSpins",
        then: Yup.string().required(),
        otherwise: Yup.string().nullable().notRequired()
      }),

    spinValue: Yup.string()
      .when("creditType", {
        is: "freeSpins",
        then: Yup.string().required(),
        otherwise: Yup.string().nullable().notRequired()
      })
      .when("spinType", (spinType: string, schema) => {
        if (spinType) return schema.nullable().notRequired();
        return schema;
      }),
    metadata: metadataValidate(fields).nullable()
  });

  return schema;
};
