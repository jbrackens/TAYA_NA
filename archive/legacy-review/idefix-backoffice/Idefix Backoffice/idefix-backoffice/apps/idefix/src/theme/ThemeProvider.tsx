import { FC, ReactNode, useMemo } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";

import { useLocalStorage } from "@idefix-backoffice/shared/hooks";
import { ThemeContext } from "./ThemeContext";
import { theme as initialTheme } from "./theme";

interface Props {
  children: ReactNode;
}

const ThemeProvider: FC<Props> = ({ children }) => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = useLocalStorage<"light" | "dark">("themeMode", prefersDarkMode ? "dark" : "light");

  const ctxValue = useMemo(
    () => ({
      mode,
      toggleMode: () => {
        setMode(prev => (prev === "light" ? "dark" : "light"));
      }
    }),
    [mode, setMode]
  );

  const theme = useMemo(
    () =>
      createTheme({
        ...initialTheme,
        palette: {
          mode
        }
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={ctxValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export { ThemeProvider };
