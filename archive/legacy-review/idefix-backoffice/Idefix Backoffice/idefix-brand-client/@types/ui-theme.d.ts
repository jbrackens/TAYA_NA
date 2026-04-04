import "styled-components";

export enum Breakpoints {
  mobile = "mobile",
  bigMobile = "bigMobile",
  tablet = "tablet",
  desktop = "desktop"
}

declare module "styled-components" {
  export interface DefaultTheme {
    breakpoints: {
      keys: Breakpoints[];
      values: {
        mobile: number;
        bigMobile: number;
        tablet: number;
        desktop: number;
      };
      up: (key: Breakpoints) => string;
      down: (key: Breakpoints) => string;
      between: (start: Breakpoints, end: Breakpoints) => string;
      only: (key: Breakpoints) => string;
      width: (key: Breakpoints) => number;
    };
    gradients: {
      errorMessage: string;
      successMessage: string;
      notificationMessage?: string;
    };
    palette: {
      primary: string;
      primaryLight: string;
      primaryDark: string;
      primaryLightest?: string;
      primaryLightest2?: string;

      secondary: string;
      secondaryLight: string;
      secondarySemiLightest: string;
      secondaryLightest: string;
      secondaryDark: string;
      secondaryDarkest: string;
      secondaryDarkest2: string;
      secondaryDarkest3: string;

      accent: string;
      accentDark: string;
      accentLight: string;
      accentLightest: string;
      accentLightest2: string;

      accent2?: string; // accent2 uses in os, kk themes only.
      accent2Light?: string; // accent2Light uses in os, kk themes only.
      accent2Dark?: string; // accent2Dark uses in vie brand only
      accent2Lightest: string;

      success: string;
      successLight: string;
      successDark: string;

      error: string;
      errorLight: string;

      submit: string;

      contrast: string;
      contrastDark?: string;
      contrastDarkest?: string;
      contrastLight?: string;

      notificationModalStickyHeaderBackground: string;

      ctaBackground: string;
    };
    typography: {
      text30BoldUpper: FlattenSimpleInterpolation;
      text28Bold: FlattenSimpleInterpolation;
      text24Bold: FlattenSimpleInterpolation;
      text24BoldCapitalize: FlattenSimpleInterpolation;
      text22Upper: FlattenSimpleInterpolation;
      text21Bold: FlattenSimpleInterpolation;
      text26Bold: FlattenSimpleInterpolation;
      text21BoldUpper: FlattenSimpleInterpolation;
      text18Bold: FlattenSimpleInterpolation;
      text16: FlattenSimpleInterpolation;
      text16BoldLink: FlattenSimpleInterpolation;
      text16Bold: FlattenSimpleInterpolation;
      text16BoldUpper: FlattenSimpleInterpolation;
      text14: FlattenSimpleInterpolation;
      text14Bold: FlattenSimpleInterpolation;
      text14BoldUpper: FlattenSimpleInterpolation;
      text14Italic: FlattenSimpleInterpolation;
      text12: FlattenSimpleInterpolation;
      text12Bold: FlattenSimpleInterpolation;
      text18ExtraBold: FlattenSimpleInterpolation;
      text10Bold: FlattenSimpleInterpolation;
      text9: FlattenSimpleInterpolation;
      text9Bold: FlattenSimpleInterpolation;
    };
    shadows: {
      mobileFooter: string;
      gameThumb: string;
      gameThumbHover: string;
      search: string;
      loginSwitcherButton: string;
      loginBox: string;
      toolbar: string;
      gameButton: string;
      notification: string;
    };
    shape: {
      borderRadius: string;
      borderRadiusBig: string;
      borderRadiusSmall: string;
    };
    zIndex: {
      header: number;
      card: number;
      modal: number;
      fullScreenDialog: number;
      notificationModal: number;
    };
    cdn?: string;
    thumbsCdn?: string;
    bonusThumbsCdn?: string;
  }
}
