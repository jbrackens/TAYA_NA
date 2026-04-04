import * as React from "react";
import { ApiContext } from "@brandserver-client/api";

export const useLogout = () => {
  const api = React.useContext(ApiContext);

  const logout = async () => {
    try {
      const response = await api.auth.logout();
      if (response.ok) {
        window.location.assign("/");
      }
    } catch (error) {
      console.log("Failed to logout");
    }
  };

  return logout;
};
