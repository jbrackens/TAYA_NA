import React, { ReactNode } from "react";
import {
  validateAndCheckEligibility,
  resolveToken,
} from "../../../utils/auth";
import { PunterRoles } from "@phoenix-ui/utils";

export type ProtectedProps = {
  children: ReactNode;
  roles?: PunterRoles | undefined;
};

const Protected = ({ children, roles }: ProtectedProps) => {
  const token = resolveToken();
  if (validateAndCheckEligibility(token, roles)) {
    return children;
  }
  return <></>;
};

export default Protected;
