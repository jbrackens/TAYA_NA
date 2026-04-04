import { createContext } from "react";

type Mode = "light" | "dark";

const ThemeContext = createContext<{ mode: Mode; toggleMode: () => void }>({
  mode: "light",
  toggleMode: () => {
    console.log("You have to implement toggle callback");
  }
});

export { ThemeContext };
