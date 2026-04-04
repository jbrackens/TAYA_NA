import React, { createContext, ReactNode, FC, useMemo } from "react";
import { ThemeProvider, DefaultTheme } from "styled-components";
import GlobalStyles from "./global-styles";
import { defaultRegistry, UIRegistry } from "./UIRegistry";
import { Config } from "@brandserver-client/types";

const UIContext = createContext<UIRegistry>(defaultRegistry);

interface ProviderProps {
  theme: DefaultTheme;
  config: Config;
  children: ReactNode;
}

const UIProvider: FC<ProviderProps> = ({ theme, children, config }) => {
  const extendedTheme = useMemo(
    () => ({
      ...theme,
      cdn: config && config.cdn,
      thumbsCdn: config && config.thumbsCdn,
      bonusThumbsCdn: config && config.bonusThumbsCdn
    }),
    [config]
  );

  return (
    <ThemeProvider theme={extendedTheme}>
      <GlobalStyles />
      <UIContext.Provider value={defaultRegistry}>
        {children}
      </UIContext.Provider>
    </ThemeProvider>
  );
};

export { UIContext, UIProvider };
