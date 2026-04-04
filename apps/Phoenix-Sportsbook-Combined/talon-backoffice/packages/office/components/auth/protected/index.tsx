import React, { ReactNode, useState, useEffect } from "react";
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
  // Defer token resolution to client to avoid SSR hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const token = mounted ? resolveToken() : null;
  if (validateAndCheckEligibility(token, roles)) {
    return <>{children}</>;
  }
  return null;
};

export default Protected;
