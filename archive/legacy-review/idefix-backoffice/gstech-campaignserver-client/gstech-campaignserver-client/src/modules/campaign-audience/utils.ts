import formatISO from "date-fns/formatISO";
import { AudienceRule } from "app/types";
import isArray from "lodash/isArray";

import { IFormValues } from "./types";
import { MinutesIn, RULE_TYPES } from "./index";
import { formatToCents, formatToCurrency } from "../../utils/formatMoney";

export function setRuleInitialValues(type: string): Omit<AudienceRule, "id"> {
  switch (type) {
    case "numDeposits":
      return {
        name: type,
        values: "1",
        operator: ">=",
        not: false
      };
    case "depositAmount":
      return {
        name: type,
        not: false,
        operator: "between",
        values: [100, 200]
      };
    case "deposit":
      return {
        name: type,
        values: 60,
        operator: "withinMinutes",
        not: false
      };
    case "totalDepositAmount":
      return {
        name: type,
        not: false,
        operator: ">=",
        values: 1000
      };
    case "country":
    case "language":
    case "tags":
    case "segments":
    case "campaignDeposit":
      return {
        name: type,
        values: [],
        operator: "in",
        not: false
      };
    case "otherCampaignsMember":
      return {
        name: "otherCampaignsMember",
        not: false,
        operator: "otherCampaignsMember",
        values: {
          campaignIds: [],
          state: "any"
        }
      };
    case "otherCampaignReward":
      return {
        name: "",
        values: {
          campaignId: null,
          rewardId: null
        },
        operator: "otherCampaignReward",
        not: false
      };
    case "contact":
    case "addedToCampaign":
      return {
        name: type,
        values: 60,
        operator: "withinMinutes",
        not: true
      };
    case "gameManufacturer":
      return { name: "", operator: "gameManufacturer", values: "NE" };
    default:
      return {
        name: type,
        values: formatISO(new Date()),
        operator: "=",
        not: false
      };
  }
}

export function getRuleLabel(ruleName: string, ruleOperator: IFormValues["operator"]) {
  const rule = RULE_TYPES.find(ruleType => ruleType.value === ruleName);

  if (rule) {
    return rule.label;
  }

  if (ruleOperator === "csv") {
    return "CSV file";
  }

  if (ruleOperator === "otherCampaignsMember") {
    return "Campaign membership";
  }

  if (ruleOperator === "gameManufacturer") {
    return "Game manufacturer";
  }

  return "Campaign rewards";
}

export function formatSendingDraftValues(
  values: AudienceRule["values"],
  ruleName: AudienceRule["name"],
  ruleOperator?: AudienceRule["operator"]
) {
  switch (ruleName) {
    case "depositAmount":
    case "totalDepositAmount":
      return isArray(values) ? values.map(val => formatToCents(val)) : formatToCents(values);
    case "otherCampaignsMember":
      if (values.withinMinutes) {
        return {
          ...values,
          withinMinutes: Number(values.withinMinutes.withinMinutes) * Number(values.withinMinutes.multiplier)
        };
      }
      return values;

    default:
      if (ruleOperator && ruleOperator === "withinMinutes") {
        return Number(values.withinMinutes) * Number(values.multiplier);
      }
      return values;
  }
}

export function formatInitialValues(
  values: AudienceRule["values"],
  ruleName: AudienceRule["name"],
  ruleOperator?: AudienceRule["operator"]
) {
  switch (ruleName) {
    case "depositAmount":
    case "totalDepositAmount":
      return isArray(values) ? values.map(val => formatToCurrency(val)) : formatToCurrency(values);
    case "otherCampaignsMember":
      if (values.withinMinutes) {
        return { ...values, withinMinutes: checkMinutesMultiplier(values.withinMinutes) };
      }
      return values;
    default:
      if (ruleOperator && ruleOperator === "withinMinutes") {
        return checkMinutesMultiplier(values);
      }
      return values;
  }
}

function getMultiplier(minutes: number): number {
  if (minutes >= MinutesIn.Month) {
    if (minutes % MinutesIn.Month !== 0) {
      if (minutes >= MinutesIn.Week) {
        if (minutes % MinutesIn.Week !== 0) {
          const mins = minutes - Math.floor(minutes / MinutesIn.Week) * MinutesIn.Week;
          return getMultiplier(mins);
        }
        return MinutesIn.Week;
      }

      const mins = minutes - Math.floor(minutes / MinutesIn.Month) * MinutesIn.Month;
      return getMultiplier(mins);
    }
    return MinutesIn.Month;
  }
  if (minutes >= MinutesIn.Week) {
    if (minutes % MinutesIn.Week !== 0) {
      const mins = minutes - Math.floor(minutes / MinutesIn.Week) * MinutesIn.Week;
      return getMultiplier(mins);
    }
    return MinutesIn.Week;
  }
  if (minutes >= MinutesIn.Day) {
    if (minutes % MinutesIn.Day !== 0) {
      const mins = minutes - Math.floor(minutes / MinutesIn.Day) * MinutesIn.Day;
      return getMultiplier(mins);
    }
    return MinutesIn.Day;
  }
  if (minutes >= MinutesIn.Hour) {
    if (minutes % MinutesIn.Hour !== 0) {
      const mins = minutes - Math.floor(minutes / MinutesIn.Hour) * MinutesIn.Hour;
      return getMultiplier(mins);
    }
    return MinutesIn.Hour;
  } else {
    return 1;
  }
}

function checkMinutesMultiplier(minutes: number) {
  const multiplier = getMultiplier(minutes);

  return { withinMinutes: minutes / multiplier, multiplier: multiplier };
}

export function formatSendingOperator(operator: AudienceRule["operator"], not: boolean): string {
  if (not === true) {
    switch (operator) {
      case "<":
        return ">=";
      case "<=":
        return ">";
      case "=":
        return "!=";
      case "!=":
        return "=";
      case ">":
        return "<=";
      case ">=":
        return "<";
      default:
        return operator;
    }
  }
  return operator;
}

export function formatInitialOperator(
  operator: AudienceRule["operator"],
  not?: boolean
): { operator: AudienceRule["operator"]; not: "is" | "not" } {
  if (not === undefined) return { operator, not: "is" };

  switch (operator) {
    case "!=":
      return { operator: "=", not: "not" };
    default:
      return { operator, not: not ? "not" : "is" };
  }
}
