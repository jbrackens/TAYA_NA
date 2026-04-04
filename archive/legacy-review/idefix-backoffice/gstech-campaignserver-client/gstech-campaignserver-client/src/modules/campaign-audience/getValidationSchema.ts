import * as yup from "yup";

import { IFormValues } from "./types";

export default function getValidationSchema(name: string, operator: IFormValues["operator"]) {
  const numberRuleSchema = yup.object().shape({
    operator: yup.string().oneOf([">=", ">", "!=", "=", "<", "<=", "between"]).required(),
    values: yup.mixed().when("operator", {
      is: "between",
      then: yup
        .array(yup.string().required())
        .required()
        .test("compare values", "From value should be smaller than to", function (values) {
          if (values && values.length === 2 && Number(values[0]) >= Number(values[1])) {
            return false;
          }

          return true;
        }),
      otherwise: yup.string().required()
    })
  });

  const setRuleSchema = yup.object().shape({
    values: yup.array(yup.string())
  });

  const dateRuleSchema = yup.object().shape({
    operator: yup.string().oneOf([">=", ">", "!=", "=", "<", "<=", "between", "withinMinutes"]).required(),
    values: yup
      .mixed()
      .when("operator", {
        is: ">=" || ">" || "!=" || "=" || "<" || "<=",
        then: yup.date().required()
      })
      .when("operator", {
        is: "withinMinutes",
        then: yup.object().shape({
          withinMinutes: yup.string().required(),
          multiplier: yup.number().required()
        })
      })
      .when("operator", {
        is: "between",
        then: yup.array(yup.date().required()).required()
      }),
    "values[1]": yup.date().when("operator", {
      is: "between",
      then: yup.date().test("compare dates", "End time must be later than Start time", function () {
        return this.parent && this.parent.values && this.parent.values && this.parent.values[1] > this.parent.values[0];
      })
    })
  });

  const csvRuleSchema = yup.object().shape({
    operator: yup.string().oneOf(["csv"]).required(),
    values: yup.string().required()
  });

  const contactRuleSchema = yup.object().shape({
    values: yup.mixed().when("operator", {
      is: "withinMinutes",
      then: yup.object().shape({
        withinMinutes: yup.string().required(),
        multiplier: yup.number().required()
      })
    })
  });

  const campaignRewardRuleSchema = yup.object().shape({
    operator: yup.string().oneOf(["otherCampaignReward"]).required(),
    values: yup.object().shape({
      campaignId: yup.number().nullable().required(),
      rewardId: yup.string().required()
    })
  });

  const campaignDepositRuleSchema = yup.object().shape({
    operator: yup.string().oneOf(["in", "="]).required(),
    values: yup.mixed().when("operator", {
      is: "=",
      then: yup.string().required(),
      otherwise: yup.array(yup.string().required()).required()
    })
  });

  if (!name) {
    switch (operator) {
      case "csv":
        return csvRuleSchema;
      case "otherCampaignReward":
        return campaignRewardRuleSchema;
    }
  }

  switch (name) {
    case "numDeposits":
    case "depositAmount":
    case "totalDepositAmount":
      return numberRuleSchema;
    case "language":
    case "country":
    case "tags":
      return setRuleSchema;
    case "campaignDeposit":
    case "campaign":
      return campaignDepositRuleSchema;
    case "register":
    case "login":
    case "deposit":
      return dateRuleSchema;
    case "contact":
    case "addedToCampaign":
      return contactRuleSchema;
  }
}
