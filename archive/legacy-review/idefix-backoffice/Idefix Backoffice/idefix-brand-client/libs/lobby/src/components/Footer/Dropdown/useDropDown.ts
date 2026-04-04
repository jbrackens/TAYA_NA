import * as React from "react";
import { DropDownContext } from "./context";

function useDropDown() {
  const context = React.useContext(DropDownContext);

  if (context === undefined) {
    throw new Error("useDropDown must be used within a DropDownProvider");
  }

  return context;
}

export { useDropDown };
