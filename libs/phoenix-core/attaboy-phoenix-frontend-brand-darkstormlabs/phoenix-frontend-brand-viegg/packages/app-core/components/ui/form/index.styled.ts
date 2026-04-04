import styled from "styled-components";
import { Form } from "antd";
import { BasePasswordInput } from "../input/index.styled";

export const SelectContainer = styled.div`
  & .ant-form-item-control-input-content {
    border-bottom: none !important;
  }

  & .ant-form-item-control-input,
  .ant-input-affix-wrapper {
    height: ${(props) => 5 * props.theme.baseGutter}px;
    background-color: ${(props) => props.theme.globalForm.inputBackgroundColor};
    color: ${(props) => props.theme.uiComponents.modals.inputColor};
    border-radius: ${(props) => 0.5 * props.theme.baseGutter}px;
    border: 1px solid ${(props) => props.theme.globalForm.inputBorderColor};

    &:hover {
      background-color: ${(props) =>
        props.theme.globalForm.defaultInputBackgroundHoverColor};
      border: 1px solid
        ${(props) => props.theme.globalForm.defaultInputBorderHoverColor};
    }
    &:focus {
      box-shadow: none;
    }
    & > .ant-input {
      height: auto;
      margin-right: 0;
      background-color: transparent;
      border: none;
    }
  }

  & .ant-select {
    & .ant-select-selector,
    .ant-select-selection-item {
      & > div {
        background-color: transparent !important;
        box-shadow: none !important;
        border: none;
      }
      background-color: transparent !important;
      box-shadow: none !important;
      border: none;
    }
  }
`;

export const BaseForm = styled(Form)`
  padding: ${(props) => props.theme.baseGutter}px;
  width: 100%;
  & .ant-form-item-label {
    margin-top: 10px;
    margin-bottom: -5px;
    @media (max-width: 1200px) {
      text-align: left;
    }
    & label {
      color: ${(props) => props.theme.globalForm.fontColor};
    }
  };
  & .ant-form {
    width: 100%;
    margin-left: ${(props) => 6 * props.theme.baseGutter}px;
    margin-right: ${(props) => 6 * props.theme.baseGutter}px;
    @media (max-width: 1200px) {
      margin-left: ${(props) => 5 * props.theme.baseGutter}px;
      margin-right: ${(props) => 5 * props.theme.baseGutter}px;
    }
  };

  & .ant-form-item-required,
  .ant-form-item-no-colon {
    color: ${(props) => props.theme.globalForm.fontColor};
  };

  & .ant-typography {
    color: ${(props) => props.theme.uiComponents.modals.titleColor};
  };

  & .ant-form-item-control-input {
    width: 100%;
  };

  & .ant-input-group-addon {
    background-color: ${(props) => props.theme.globalForm.inputBackgroundColor};
    color: ${(props) => props.theme.uiComponents.modals.inputColor};
    border-radius: ${(props) => 0.5 * props.theme.baseGutter}px;
    border: none;
  };

  & .ant-input,
  .ant-input-affix-wrapper,
  .ant-input-number {
    height: ${(props) => 5 * props.theme.baseGutter}px;
    width: 100% !important;
    background-color: ${(props) => props.theme.globalForm.inputBackgroundColor};
    color: ${(props) => props.theme.uiComponents.modals.inputColor};
    border-radius: ${(props) => 0.5 * props.theme.baseGutter}px;
    border: 1px solid ${(props) => props.theme.globalForm.inputBorderColor};
    &:hover {
      border: 1px solid
        ${(props) => props.theme.globalForm.defaultInputBorderHoverColor};
        background-color: ${(props) =>
          props.theme.globalForm.defaultInputBackgroundHoverColor} !important;
    }
    &:focus {
      box-shadow: none;
    }
    & > .ant-input, ant-input-number {
      height: auto;
      margin-right: 0;
      background-color: transparent !important;
      border: none;
    }
  };

  .ant-input-number-input {
    height: ${(props) => 5 * props.theme.baseGutter}px;
  };

  //style for inout-number arrows

  & .ant-input-number {
    background-color: ${(props) =>
      props.theme.betslip.listItemInputBackgroundColor};
    color: ${(props) => props.theme.betslip.listItemInputColor};
    border-radius: ${(props) => 0.5 * props.theme.baseGutter}px;
  };
  .ant-input-number-handler-wrap {
    width: 21%;
    margin-right: 1px;
    background-color: transparent;
    border-left: none;
    .ant-input-number-handler {
      background-color: ${(props) =>
        props.theme.betslip.listItemInputHoverButtons.backgroundColor};
    };

    .ant-input-number-handler {
      height: 50% !important;
      &:hover {
        svg {
          color: ${(props) =>
            props.theme.betslip.listItemInputHoverButtons.iconHoverColor};
        }
      }
    };

    .ant-input-number-handler-up {
      border-left: none !important;
      border-top: 1px solid transparent;
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
      border-bottom: 1px solid transparent;
    };

    .ant-input-number-handler-down {
      border-left: none !important;
      border-top: 1px solid transparent;
      border-bottom-left-radius: 5px;
      border-bottom-right-radius: 5px;
    };

    .anticon {
      transform: none;
      margin-top: 0px;
      font-size: ${(props) => 1.3 * props.theme.baseGutter}px;
      position: unset;
      margin-top: 3px;
      }
    };

    svg {
      color: ${(props) =>
        props.theme.betslip.listItemInputHoverButtons.iconColor};
    }
  };

  & .anticon {
    color: ${(props) => props.theme.uiComponents.modals.inputColor};
    opacity: 0.48;
  };

  
  //overriding browser autofill
  input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 30px ${(props) =>
      props.theme.uiComponents.input.backgroundColor} inset !important;
    -webkit-text-fill-color: ${(props) =>
      props.theme.uiComponents.input.fontColor} !important;
        background-color: ${(props) =>
          props.theme.uiComponents.input.errorBackgroundColor} inset !important;
  };
  input:-webkit-autofill:hover, 
  input:-webkit-autofill:focus, 
  input:-webkit-autofill:active{
    -webkit-box-shadow: 0 0 0 30px ${(props) =>
      props.theme.uiComponents.input.backgroundHoverColor} inset !important;
    -webkit-text-fill-color: ${(props) =>
      props.theme.uiComponents.input.fontColor} !important;
  }

  //error handling
  .ant-form-item-has-error {
    input:-webkit-autofill,
    input:-webkit-autofill:hover, 
    input:-webkit-autofill:focus, 
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 30px ${(props) =>
        props.theme.uiComponents.input.errorBackgroundColor} inset !important;
      -webkit-text-fill-color: ${(props) =>
        props.theme.uiComponents.input.fontColor} !important;
  }
  
    .ant-input-affix-wrapper, input, ${SelectContainer} {
      background-color: ${(props) =>
        props.theme.uiComponents.input.errorBackgroundColor} !important;
      };
      .ant-radio-group {
      margin-bottom: ${(props) => 0.5 * props.theme.baseGutter}px;
    }
  };

  ${BasePasswordInput} {
    &:hover,
    &:active,
    &:focus,
    &:focus-visible,
    &:focus-within,
    input {
      background-color: ${(props) =>
        props.theme.uiComponents.input.errorBackgroundColor} !important;
      }
    }
  }

  ${SelectContainer} {
    & .ant-form-item-has-error {
      & .ant-form-item-control-input {
        background-color: ${(props) =>
          props.theme.uiComponents.input.errorBackgroundColor} !important;
        border: 1px solid
          ${(props) =>
            props.theme.uiComponents.input.errorBorderColor} !important;
      }
    }
  };

  & .ant-form-item-with-help {
    ${SelectContainer} {
      & .ant-form-item-control-input {
        background-color: ${(props) =>
          props.theme.uiComponents.input.errorBackgroundColor} !important;
        border: 1px solid
          ${(props) =>
            props.theme.uiComponents.input.errorBorderColor} !important;
      }
    }
    display: flex;
    vertical-align: middle;
    /* & input {
      height: ${(props) => 5 * props.theme.baseGutter}px;
      background-color: ${(props) =>
        props.theme.uiComponents.input.errorBackgroundColor};
      color: ${(props) => props.theme.globalForm.inputErrorColor};
      border: 1px solid
        ${(props) => props.theme.uiComponents.input.errorBorderColor};
      &:hover {
        background-color: ${(props) =>
          props.theme.uiComponents.input.errorBackgroundColor} !important;
        border: 1px solid
          ${(props) => props.theme.uiComponents.input.errorBorderColor};
      }
    }; */

    & .ant-input-affix-wrapper, .ant-input-number {
      height: ${(props) => 5 * props.theme.baseGutter}px;
      background-color: ${(props) =>
        props.theme.uiComponents.input.errorBackgroundColor};
      color: ${(props) => props.theme.globalForm.inputErrorColor};
      border: 1px solid
        ${(props) => props.theme.uiComponents.input.errorBorderColor};
      &:hover {
        background-color: ${(props) =>
          props.theme.uiComponents.input.errorBackgroundColor};
        border: 1px solid
          ${(props) => props.theme.uiComponents.input.errorBorderColor};
      }
      & > input {
        height: auto !important;
        border: none;
        background-color: transparent;
        margin-right: 0px;
      }
    }
  };

  & .ant-form-item-explain,
  .ant-form-item-explain-error {
    & div {
      height: auto;
      border-radius: 5px;
      padding: ${(props) => props.theme.baseGutter}px;
      display: flex;
      align-items: center;
      text-align: initial;
      color: ${(props) => props.theme.globalForm.alertColor} !important;
      font-size: ${(props) => 1.1 * props.theme.baseGutter}px;
      background-color: ${(props) =>
        props.theme.globalForm.errorBackgroundColor};
      color: white;
      font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
    }
  };

  & .ant-select {
    & .ant-select-selector {
      background-color: transparent !important;
      box-shadow: none !important;
    }
  };

  /* & .ant-alert {
    background-color: ${(props) =>
      props.theme.globalForm.alertBackgroundColor
        ? props.theme.globalForm.alertBackgroundColor
        : "red"};
    border: none;
    border-radius: 5px;
    text-align: center;
    & .ant-alert-message {
      color: ${(props) => props.theme.globalForm.alertColor};
    }
    & .anticon {
      display: none;
    }
  }; */

 

  //switch style

  /* & .ant-switch {
    background-color: ${(props) =>
      props.theme.globalForm.switchBackgroundColor};
    box-shadow: none !important;
    outline-color: transparent !important;
    
    & .anticon {
      display: none;
    };

    & .ant-switch-handle:before {
      background-color: ${(props) =>
        props.theme.globalForm.switchUncheckedColor};
    };

    .ant-click-animating-node {
      display: none;
    }
  };

  & .ant-switch-checked {
    & .ant-switch-handle:before {
      background-color: ${(props) => props.theme.globalForm.switchCheckedColor};
    }
  }; */

  & .ant-form-item-control-input-content {
    & input {
      margin-right: ${(props) => 10 * props.theme.baseGutter}px;
      @media (max-width: 1200px) {
        margin-right: 0;
      }
    }
    &:focus {
      outline-color: transparent;
    }
  };

  // hide *
  & .ant-form-item-required {
    &:before {
      display: none !important;
    }
  };

  // checkboxes
  & .ant-checkbox-group {
    margin-top: ${(props) => 2.5 * props.theme.baseGutter}px;
  };

  .ant-checkbox {
    top: 0 !important;
  };
`;

export const InputsContainer = styled.div`
  & .ant-row,
  .ant-form-item {
    margin-bottom: 0px;
  }
  @media (max-width: 1200px) {
    margin-right: 0px;
  }
  & .ant-col,
  .ant-form-item-label {
    align-self: center;
    flex: 0 0 100%;
  }
`;

// ###########################################
export const StyledForm = styled.form`
  width: 100%;
`;
