import { css, DefaultTheme } from "styled-components";
import { breakpoints } from "@brandserver-client/ui";

const theme: DefaultTheme = {
  breakpoints,
  gradients: {
    successMessage:
      "linear-gradient(90deg, #DEFF9A 0%, rgba(222, 255, 154, 0) 100%)",
    errorMessage:
      "linear-gradient(90deg, #FAEBEB 0%, rgba(255, 233, 229, 0) 100%)",
    notificationMessage:
      "linear-gradient(90deg, #E3EDFD 0%, rgba(227, 237, 253, 0) 100%)"
  },
  shadows: {
    mobileFooter: "0px 0px 20px rgba(0, 0, 0, 0.1)",
    gameThumb: "0px 2px 6px rgba(0, 0, 0, 0.1)",
    gameThumbHover: "0px 2px 8px rgba(0, 0, 0, 0.2)",
    search: "0px 4px 10px rgba(0, 0, 0, 0.1)",
    loginSwitcherButton: "0px 2px 3px rgba(0, 0, 0, 0.2)",
    loginBox: "0px 12px 40px rgba(0, 0, 0, 0.15)",
    toolbar: "0px 0px 20px rgba(0, 0, 0, 0.1)",
    gameButton: "0px 5px 10px rgba(9, 50, 114, 0.3)",
    notification: "0px 1px 2px rgba(9, 50, 144, 0.2)"
  },
  palette: {
    primary: "#191C24",
    primaryLight: "#1D212A",
    primaryLightest: "#2A3040",
    primaryLightest2: "#343C4F",
    primaryDark: "#111318",

    secondary: "#C8CCD4",
    secondaryLight: "#D6D9Df",
    secondarySemiLightest: "#EAECEF",
    secondaryLightest: "#F6F6F8",
    secondaryDark: "#B7BCC7",
    secondaryDarkest: "#8C94A6",
    secondaryDarkest2: "#81899D",
    secondaryDarkest3: "#6D768D",

    accent: "#DD2125",
    accentLight: "#E1363A",
    accentLightest: "#e44d50",
    accentLightest2: "#f8d2d3",
    accentDark: "#B11A1E",

    accent2: "#00B75B",
    accent2Light: "#00d068",
    accent2Lightest: "#00d068",
    accent2Dark: "#009d4e",

    success: "#90CC00",
    successLight: "#DEFF9A",
    successDark: "#5C9B00",

    error: "#E64646",
    errorLight: "#FAEBEB",

    submit: "#0CD57D",

    contrast: "#E3E5EC",
    contrastLight: "#FFFFFF",
    contrastDark: "#D4D7E2",
    contrastDarkest: "#979EB8",

    notificationModalStickyHeaderBackground: "#171721",
    ctaBackground: "#115cd0"
  },
  typography: {
    text30BoldUpper: css`
      font-weight: bold;
      font-size: 30px;
      line-height: 46px;
      text-transform: uppercase;
    `,
    text28Bold: css`
      font-weight: bold;
      font-size: 28px;
      line-height: 24px;
    `,
    text26Bold: css`
      font-weight: bold;
      font-size: 26px;
      line-height: 31px;
    `,
    text24Bold: css`
      font-weight: bold;
      font-size: 24px;
      line-height: 20px;
    `,
    text24BoldCapitalize: css`
      font-weight: bold;
      font-size: 24px;
      line-height: 20px;
      text-transform: capitalize;
    `,
    text22Upper: css`
      font-size: 22px;
      line-height: 20px;
      text-transform: uppercase;
    `,
    text21Bold: css`
      font-weight: bold;
      font-size: 21px;
      line-height: 24px;
    `,
    text21BoldUpper: css`
      font-weight: bold;
      font-size: 21px;
      line-height: 20px;
      text-transform: uppercase;
      /* //TODO: remove after color names changes */
      color: #fff !important;
    `,
    text18ExtraBold: css`
      font-weight: 800;
      font-size: 18px;
      line-height: 24px;
    `,
    text18Bold: css`
      font-weight: bold;
      font-size: 18px;
      line-height: 24px;
    `,
    text16: css`
      font-size: 16px;
      line-height: 24px;
    `,
    text16BoldLink: css`
      font-weight: bold;
      font-size: 16px;
      line-height: 24px;
      text-decoration-line: underline;
    `,
    text16Bold: css`
      font-weight: bold;
      font-size: 16px;
      line-height: 24px;
    `,
    text16BoldUpper: css`
      font-weight: bold;
      font-size: 16px;
      line-height: 20px;
      text-transform: uppercase;
    `,
    text14: css`
      font-size: 14px;
      line-height: 20px;
    `,
    text14Italic: css`
      font-style: italic;
      font-weight: normal;
      font-size: 14px;
      line-height: 24px;
    `,
    text14Bold: css`
      font-weight: bold;
      font-size: 14px;
      line-height: 20px;
    `,
    text14BoldUpper: css`
      font-weight: bold;
      font-size: 14px;
      line-height: 20px;
      text-transform: uppercase;
    `,
    text12: css`
      font-size: 12px;
      line-height: 20px;
    `,
    text12Bold: css`
      font-weight: bold;
      font-size: 12px;
      line-height: 20px;
    `,
    text10Bold: css`
      font-weight: bold;
      font-size: 10px;
      line-height: 20px;
    `,
    text9: css`
      font-size: 9px;
      line-height: 14px;
    `,
    text9Bold: css`
      font-weight: 700;
      font-size: 9px;
      line-height: 14px;
    `
  },
  shape: {
    borderRadius: "4px",
    borderRadiusBig: "8px",
    borderRadiusSmall: "3px"
  },
  zIndex: {
    header: 1100,
    fullScreenDialog: 1005,
    notificationModal: 1110,
    card: 1000,
    modal: 2000000
  }
};

export { theme };
