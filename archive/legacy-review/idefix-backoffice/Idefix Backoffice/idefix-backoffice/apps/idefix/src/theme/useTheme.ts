import { useContext } from "react";
import { ThemeContext } from "./ThemeContext";

const useTheme = () => {
  const { mode, toggleMode } = useContext(ThemeContext);

  return { mode, handleToggleMode: toggleMode };
};

export { useTheme };
