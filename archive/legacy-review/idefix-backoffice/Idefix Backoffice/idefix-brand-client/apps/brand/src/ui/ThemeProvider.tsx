import React, { FC, ReactNode } from "react";
import { UIProvider } from "@brandserver-client/ui";
import { theme } from "./theme";
import { Config } from "@brandserver-client/types";

interface Props {
  children: ReactNode;
  config: Config;
}

const ThemeProvider: FC<Props> = ({ children, config }) => {
  return (
    <UIProvider theme={theme} config={config}>
      {children}
    </UIProvider>
  );
};

export { ThemeProvider };
