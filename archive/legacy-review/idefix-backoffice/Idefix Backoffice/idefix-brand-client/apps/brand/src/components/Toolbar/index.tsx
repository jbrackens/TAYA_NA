import * as React from "react";
import { useIsLoggedIn } from "@brandserver-client/hooks";
import LoggedinToolbar from "./LoggedinToolbar";
import NonLoggedinToolbar from "./NonLoggedinToolbar";

const VieToolbar: React.FC = () => {
  const isLoggedIn = useIsLoggedIn();

  if (!isLoggedIn) {
    return <NonLoggedinToolbar />;
  }

  return <LoggedinToolbar />;
};

export default VieToolbar;
