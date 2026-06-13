import {
  MenuItem,
  MenuItemGroupEnum,
  MenuItemGroupedIcons,
} from "types/menu.d";
import { DashboardOutlined, ReconciliationOutlined } from "@ant-design/icons";
import defaultMenuStructure from "./structure";
import { MenuModulesPathEnum } from "./structure";
import { PunterRoleEnum } from "@phoenix-ui/utils";

export const defaultMenuItems: MenuItem[] = [
  // {
  //   key: "home",
  //   path: defaultMenuStructure.path(),
  //   label: "DASHBOARD",
  // },
  {
    key: "users",
    path: defaultMenuStructure.users.path(),
    label: "USERS",
    roles: [PunterRoleEnum.ADMIN, PunterRoleEnum.OPERATOR],
  },
  {
    key: "risk-management",
    path: defaultMenuStructure.get(MenuModulesPathEnum.RISK_MANAGEMENT).path(),
    label: "RISK_MANAGEMENT",
    roles: [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER],
    children: [
      // {
      //   key: "summary",
      //   group: MenuItemGroupEnum.DASHBOARD,
      //   path: defaultMenuStructure
      //     .get(MenuModulesPathEnum.RISK_MANAGEMENT)
      //     .summary.path(),
      //   label: "RISK_MANAGEMENT_SUMMARY",
      //   roles: [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER],
      // },
      {
        key: "fixtures",
        group: MenuItemGroupEnum.TRADING,
        path: defaultMenuStructure
          .get(MenuModulesPathEnum.RISK_MANAGEMENT)
          .fixtures.path(),
        label: "RISK_MANAGEMENT_FIXTURES",
        roles: [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER],
      },
      {
        key: "markets",
        group: MenuItemGroupEnum.TRADING,
        path: defaultMenuStructure
          .get(MenuModulesPathEnum.RISK_MANAGEMENT)
          .markets.path(),
        label: "RISK_MANAGEMENT_MARKETS",
        roles: [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER],
      },
      {
        key: "market-categories",
        group: MenuItemGroupEnum.TRADING,
        path: defaultMenuStructure
          .get(MenuModulesPathEnum.RISK_MANAGEMENT)
          ["market-categories"].path(),
        label: "RISK_MANAGEMENT_MARKET_CATEGORIES",
        roles: [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER],
      },
    ],
  },
  {
    key: "logs",
    path: defaultMenuStructure.logs.path(),
    label: "LOGS",
    roles: [PunterRoleEnum.ADMIN, PunterRoleEnum.OPERATOR],
  },
  {
    key: "terms-and-conditions",
    path: defaultMenuStructure
      .get(MenuModulesPathEnum.TERMS_AND_CONDITIONS)
      .path(),
    label: "TERMS_AND_CONDITIONS",
    roles: [PunterRoleEnum.ADMIN, PunterRoleEnum.OPERATOR],
  },
];

export const defaultGroupIcons: MenuItemGroupedIcons = {
  [MenuItemGroupEnum.DASHBOARD]: DashboardOutlined,
  [MenuItemGroupEnum.TRADING]: ReconciliationOutlined,
};
