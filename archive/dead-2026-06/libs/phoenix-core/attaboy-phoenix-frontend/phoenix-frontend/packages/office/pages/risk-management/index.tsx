import { NextPageContext } from "next";
import Router from "next/router";
import { securedPage } from "../../utils/auth";
import { PunterRoleEnum } from "@phoenix-ui/utils";

function RiskManagement() {
  if (process.browser) {
    Router.push("/risk-management/markets");
  }
  return null;
}

RiskManagement.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(ctx, {}, [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER]);

export default RiskManagement;
