import "styled-components";
import { ThemeType } from "./core-theme";

declare module "styled-components" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface DefaultTheme extends ThemeType {}
}
