import * as React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { getGoogleClientId } from "./utils";

interface Props {
  children: React.ReactNode;
}

const clientId = getGoogleClientId();

const GoogleAuthProvider: React.FC<Props> = ({ children }) => (
  <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
);

export { GoogleAuthProvider };
