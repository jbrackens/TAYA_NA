import "styled-components";
import type { UITheme } from "@brandserver-client/ui";

declare module "styled-components" {
  export interface DefaultTheme extends UITheme {
    cdn: string;
    thumbsCdn: string;
    bonusThumbsCdn: string;
  }
}
