import { DefaultTheme } from "styled-components";

type Output = {
  input: string;
  placeholder: string;
  hover: string;
  focus: string;
};

const getInputStyles = (theme: DefaultTheme): Output => {
  return {
    input: `
          height: 60px;
          color: ${theme.palette.contrast};
          background: ${theme.palette.primaryLightest};
          border-radius: ${theme.shape.borderRadius};
          ${theme.typography.text16};
          transition: none;
          border: none;
          border: 2px solid ${theme.palette.primaryLightest2};
        `,
    placeholder: `
          color: ${theme.palette.contrastDarkest};
        `,
    hover: ``,
    focus: ``
  };
};

function getHostedFieldStyles(theme: DefaultTheme, showFieldLabel?: boolean) {
  return `
    html {
      min-width: fit-content;
    }

    body {
      color: ${theme.palette.contrastDark};
      background-color: ${theme.palette.primaryLight};
    }

    * .hosted-input-container {
      margin-top: ${showFieldLabel ? 0 : "6px"};
      background-color: ${theme.palette.primaryLight};
    }

    * .hosted-input-container .input-container input {
      ${getInputStyles(theme).input}
    }

    * .hosted-input-container .input-container input::placeholder {
     ${getInputStyles(theme).placeholder}
    }

    * .hosted-input-container .input-container input:hover {
      ${getInputStyles(theme).hover}
    }

    * .hosted-input-container .input-container input:focus {
      ${getInputStyles(theme).focus}
    }

    * .hosted-input-container .input-container input.error {
      border-color: ${theme.palette.error} !important;
      background: ${theme.palette.secondaryLightest};
    }

    * .hosted-input-container .input-container label {
      display: ${showFieldLabel ? "block" : "none"};
      margin-bottom: 6px;
      font-family: "PT Sans",sans-serif;
      font-style: normal;
      font-weight: normal;
      font-size: 14px;
      line-height: 20px;
      color: ${theme.palette.secondaryDarkest3};
      text-transform: none;
    }

    * .hosted-input-container .input-container control {
      margin-bottom: 0 !important;
    }

    * .hosted-input-container .input-container div.form-error {
      position: relative;
      top: 0;
      right: 0;
      width: 100%;
      padding-left: 20px;
      margin: 9px 0 3px;
      color: ${theme.palette.error};
      background: ${theme.gradients.errorMessage};
      border-radius: 2px;
      font-family: "PT Sans",sans-serif;
      font-style: normal;
      font-weight: normal;
      font-size: 12px;
      line-height: 20px;
    }

    * .hosted-input-container .input-container div.form-error:before {
      content: "";
      position: absolute;
      background: ${theme.palette.error};
      left: 0;
      width: 10px;
      min-height: 20px;
      align-self: stretch;
      border-radius: 2px 0 0 2px;
    }
  `;
}

export { getHostedFieldStyles };
