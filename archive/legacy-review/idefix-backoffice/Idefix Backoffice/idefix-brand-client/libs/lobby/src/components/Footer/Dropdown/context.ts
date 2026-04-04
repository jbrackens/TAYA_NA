import * as React from "react";

type Context = {
  isOpen: boolean;
  handleChange: (value: string) => void;
};

const DropDownContext = React.createContext<Context | undefined>(undefined);

export { DropDownContext };
