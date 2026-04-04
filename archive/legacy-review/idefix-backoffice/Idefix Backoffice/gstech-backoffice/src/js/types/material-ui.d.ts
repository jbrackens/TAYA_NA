import { MuiPickersOverrides } from "material-ui-pickers/typings/overrides";
import { Colors, Typography } from "../theme/theme";

type OverridesNameToClassKey = {
  [P in keyof MuiPickersOverrides]: keyof MuiPickersOverrides[P];
};

declare module "@material-ui/core/styles/overrides" {
  export interface ComponentNameToClassKey extends OverridesNameToClassKey {}
}

declare module "@material-ui/core/styles" {
  interface Theme {
    colors: Colors;
    typography: Typography;
  }

  interface ThemeOptions {
    colors?: Colors;
    typography?: Typography;
  }
}
