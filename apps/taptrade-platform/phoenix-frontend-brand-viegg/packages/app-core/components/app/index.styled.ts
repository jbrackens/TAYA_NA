import { createGlobalStyle } from "styled-components";
import { StyledResult } from "../results/index.styled";
import { StyledOptionContent } from "../ui/select/index.styled";

export const GlobalStyle = createGlobalStyle<any>`
  body {
    font-family: "DM Sans", sans-serif;
    background: var(--sb-bg-base);
    color: var(--sb-text-primary);
    font-size: 13px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
   
    & #__next {
      height: 100%;
    }

    overflow-y: scroll;
    ::-webkit-scrollbar {
      width: 4px;
      background: var(--sb-bg-base);
    }

    ::-webkit-scrollbar-track {
      background: var(--sb-bg-base);
    }

    ::-webkit-scrollbar-thumb {
      background: var(--sb-border);
      border-radius: 2px;
    }

    //modals
    & .ant-modal-confirm-body {
      display: flex;
      flex-flow: row wrap;
      & .anticon {
        margin-right: 0;
        width: 100%;
        margin-bottom: ${(props) => 3 * props.theme.baseGutter}px; 
        svg {
          width: ${(props) => 5 * props.theme.baseGutter}px;
          height: ${(props) => 5 * props.theme.baseGutter}px;
          border-radius: 50%;
        }
      }
    }

    & .ant-modal-body {
      padding-top: ${(props) => 5 * props.theme.baseGutter}px !important;
      padding-bottom: ${(props) => 5 * props.theme.baseGutter}px !important;
    }

    & .ant-modal-confirm-title {
      width: 100%;
      text-align: center;
      font-size: ${(props) => 2.4 * props.theme.baseGutter}px !important;
      font-weight: 800 !important;
      font-stretch: normal !important;
      font-style: normal !important;
    }

    & .ant-modal-confirm-content {
      text-align: center;
      width: 100%;
      margin-left: 0 !important;
      font-size: ${(props) => 1.6 * props.theme.baseGutter}px !important;
      font-weight: 500 !important;
      font-stretch: normal !important;
      font-style: normal !important;
    }

    & .ant-modal-confirm-btns {
      width: 100%;
      text-align: center;
      & .ant-btn {
        font-size: 16px !important;
        font-weight: bold !important;
        font-stretch: normal !important;
        font-style: normal !important;
      }
    }

    & .ant-modal-content {
      border-radius: 10px;
      background-color: ${(props) =>
        props.theme.uiComponents.modals.backgroundColor};
      & .ant-modal-confirm-title, .ant-modal-confirm-content {
        color: ${(props) => props.theme.globalForm.fontColor} !important;
      }
    }



    .ant-modal-confirm-info, 
    .ant-modal-confirm-success, 
    .ant-modal-confirm-error, 
    .ant-modal-confirm-warning {
      .anticon {
        display: none;
      }

      ${StyledResult} {
        height: auto !important;
        .ant-result {
          padding: 0;
        }
      }

      .ant-modal-confirm-btns {
        display: none;
      }
    }

    // spinner style - for inline spinners in ant components
    .ant-spin {
      background-color: ${(props) =>
        props.theme.spinnerContainerBackgroundColor};
    }
    & .ant-spin-dot-item {
      background-color: ${(props) => props.theme.spinnerBackgroundColor};
    }

    //popover style 
    .ant-popover-inner {
      border-radius: 10px;
      background-color: ${(props) => props.theme.popover.backgroundColor};
      border: 2px solid
        ${(props) => props.theme.popover.borderColor} !important;
      border-radius: 10px;
      width: ${(props) => 25 * props.theme.baseGutter}px;
      text-align: center;
    }
  
    .ant-popover-inner-content {
      color: ${(props) => props.theme.popover.fontColor};
    }
  
    .ant-popover-arrow {
      border-right-color: ${(props) =>
        props.theme.popover.borderColor} !important;
      border-bottom-color: ${(props) =>
        props.theme.popover.borderColor} !important;
  }

  //radio style
  & .ant-radio-inner {
    border-color: ${(props) =>
      props.theme.globalForm.radioBorderColor} !important;
    background-color: ${(props) => props.theme.globalForm.radioBackgroundColor};
    &:after {
      background-color: ${(props) => props.theme.globalForm.radioTickColor};
    }
  }

  & .ant-radio-wrapper {
    color: ${(props) => props.theme.globalForm.radioLabelColor};
  }

  .ant-radio-input:focus, .ant-radio-inner {
    box-shadow: none !important;
  }

  .ant-radio-checked::after {
    border-color: ${(props) => props.theme.globalForm.radioTickColor};
  }

  *:focus-visible {
    outline: 2px solid var(--sb-accent-cyan);
    outline-offset: 2px;
  }

  // dropdown scrollbar style
  .rc-virtual-list-scrollbar {
    background-color:  ${(props) =>
      props.theme.globalForm.scrollbarBackgroundColor} !important;
  }

  .rc-virtual-list-holder-inner {
    background-color: ${(props) =>
      props.theme.uiComponents.select.backgroundColor};
    padding-left: 5px;
    padding-right: 5px;
  }

  .rc-virtual-list-scrollbar-thumb {
    background-color:  ${(props) =>
      props.theme.globalForm.scrollbarThumbColor} !important;
  }

  .ant-select-item {
    background-color: ${(props) =>
      props.theme.globalForm.scrollbarBackgroundColor} !important;
    
    border-radius: 5px;
    &:last-child {
      margin-bottom: 5px;
    };
    
    &:first-child {
      margin-top: 5px;
    }
  }

  .ant-select-item-option-disabled {
    div {
      color: ${(props) =>
        props.theme.globalForm.dropdownDisabledColor} !important;
    }
  }

  .ant-select-item-option-selected, .ant-select-item-option-active {
    img {
      //to fix svg visibility problem
      filter: opacity(1);
    }
    ${StyledOptionContent} {
      background-color: ${(props) =>
        props.theme.uiComponents.select.activeBackgroundColor};
    }
  }
  //drawer

  .ant-drawer-content-wrapper {
    display: flex;
    justify-content: center;
    text-align: center;
  };

  .ant-drawer-header {
    background-color: ${(props) => props.theme.cashier.headerBackgroundColor};
    border-bottom: 1px solid ${(props) => props.theme.cashier.dividerColor};

    * {
      color: ${(props) => props.theme.cashier.headerFontColor} !important;
    };
  };

  .ant-drawer-body {
    background-color: ${(props) => props.theme.cashier.bodyBackgroundColor};
    padding: 0;
  };
  
  // spinner style - for inline spinners in ant components
  .ant-spin {
    margin-top: ${(props) => 10 * props.theme.baseGutter}px;
  };
}
`;
