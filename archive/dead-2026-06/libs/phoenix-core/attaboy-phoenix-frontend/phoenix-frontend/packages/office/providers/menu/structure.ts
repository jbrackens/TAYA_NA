import { initMenuBuilder } from "./utils/builder";

export enum MenuModulesPathEnum {
  USERS = "users",
  RISK_MANAGEMENT = "risk-management",
  LOGS = "logs",
  TERMS_AND_CONDITIONS = "terms-and-conditions",
  ACCOUNT = "account",
}

const defaultMenuStructure = initMenuBuilder()
  .set(MenuModulesPathEnum.USERS)
  .set(MenuModulesPathEnum.RISK_MANAGEMENT)
  .set(MenuModulesPathEnum.LOGS)
  .set(MenuModulesPathEnum.TERMS_AND_CONDITIONS);

// Users
defaultMenuStructure.users.set("details", ":id");

// Risk Management
defaultMenuStructure.get(MenuModulesPathEnum.RISK_MANAGEMENT).set("summary");
defaultMenuStructure
  .get(MenuModulesPathEnum.RISK_MANAGEMENT)
  .set("markets")
  .markets.set("details", ":id");
defaultMenuStructure
  .get(MenuModulesPathEnum.RISK_MANAGEMENT)
  .set("fixtures")
  .fixtures.set("details", ":id");
defaultMenuStructure
  .get(MenuModulesPathEnum.RISK_MANAGEMENT)
  .set("market-categories")
  .fixtures.set("details", ":id");

export default defaultMenuStructure;
