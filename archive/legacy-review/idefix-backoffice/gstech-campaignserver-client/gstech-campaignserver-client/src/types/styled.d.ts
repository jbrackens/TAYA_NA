import "styled-components";

import { theme } from "../styled";

type CampaignsTheme = typeof theme;

declare module "styled-components" {
  export interface DefaultTheme extends CampaignsTheme {}
}
