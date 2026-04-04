import React, { useCallback } from "react";
import { CredentialResponse, GoogleLogin, GoogleLoginProps } from "@react-oauth/google";
import { setGoogleCookie, redirect } from "../utils";

type Props = Omit<GoogleLoginProps, "onSuccess" | "onError"> & {
  redirectPath?: string;
};

const LoginButton: React.FC<Props> = ({ redirectPath, ...rest }) => {
  const handleSuccess = useCallback(
    (response: CredentialResponse) => {
      if (response && response.credential) {
        setGoogleCookie(response.credential);
        redirectPath && redirect(redirectPath);
      }

      return;
    },
    [redirectPath]
  );

  const handleError = useCallback(() => {
    console.error("Login Failed");
  }, []);

  return <GoogleLogin {...rest} onSuccess={handleSuccess} onError={handleError} />;
};

export { LoginButton };
