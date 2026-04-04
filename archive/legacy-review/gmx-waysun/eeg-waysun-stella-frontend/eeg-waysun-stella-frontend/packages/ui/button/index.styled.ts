import styled from "styled-components";

type StyledButtonProps = {
  $buttonType?: string | undefined;
  $fullWidth?: boolean;
  $disabled?: boolean;
  $compact?: boolean;
  $loading?: boolean;
};

export const StyledButton = styled.button<StyledButtonProps>`
  border-radius: 7px;
  color: white;
  min-width: 30px;
  padding: ${(props) => (props.$compact ? "5px" : "10px 20px")};
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
  width: ${(props) => (props.$fullWidth ? "100%" : "auto")};
  user-select: none;
  transition: 0.2s;
  margin-right: ${(props) =>
    props.$fullWidth || props.$compact ? "0" : "10px"};
  ${(props) =>
    props.$loading && {
      opacity: 0.8,
      cursor: "auto",
    }}
  &:hover {
    ${(props) =>
      props.$buttonType === "default" && {
        "background-color":
          props.theme.uiComponents.button.defaultBackgroundHoverColor,
      }}
    ${(props) =>
      (props.$buttonType === "primary" ||
        props.$buttonType === "secondary") && {
        "background-color": props.theme.uiComponents.button.hoverColor,
      }}
    ${(props) =>
      props.$buttonType === "colored" && {
        opacity: 0.8,
      }}
    ${(props) =>
      props.$buttonType === "nobackground" && {
        "background-color": "transparent",
        border: "0",
      }}
    ${(props) =>
      props.$buttonType === "danger" && {
        "background-color": props.theme.uiComponents.button.dangerColor,
        border: `1px solid ${props.theme.uiComponents.button.dangerColor}`,
      }}
    ${(props) =>
      props.$disabled && {
        "background-color": props.theme.uiComponents.button.disableColor,
        "background-image": "none",
        border: `1px solid ${props.theme.uiComponents.button.disableColor}`,
        color: props.theme.uiComponents.button.disabledFont,
        cursor: "not-allowed",
      }}
    ${(props) =>
      props.$buttonType === "blue-outline" && {
        "background-color":
          props.theme.uiComponents.button.blueOutlineBorderColor,
        border: `1px solid ${props.theme.uiComponents.button.blueOutlineBorderColor}`,
      }}
    ${(props) =>
      props.$buttonType === "white-outline" && {
        "background-color": props.theme.uiComponents.button.whiteOutlineColor,
        border: `1px solid ${props.theme.uiComponents.button.whiteOutlineBorderColorHover}`,
      }}
  }
  &:active {
    background-color: ${(props) => props.theme.uiComponents.button.selectColor};
    color: ${(props) => props.theme.uiComponents.button.selectFontColor};
    ${(props) =>
      props.$buttonType === "nobackground" && {
        "background-color": "transparent",
        border: "0",
      }}
    ${(props) =>
      props.$buttonType === "danger" && {
        "background-color":
          props.theme.uiComponents.button.denagerColorBackgroundActive,
        border: `1px solid ${props.theme.uiComponents.button.dangerColor}`,
      }}
    ${(props) =>
      props.$disabled && {
        "background-color": props.theme.uiComponents.button.disableColor,
        "background-image": "none",
        border: `1px solid ${props.theme.uiComponents.button.disableColor}`,
        color: props.theme.uiComponents.button.disabledFont,
        cursor: "not-allowed",
      }}
    ${(props) =>
      props.$buttonType === "blue-outline" && {
        "background-color": props.theme.uiComponents.button.blueOutlineColor,
        border: `1px solid ${props.theme.uiComponents.button.blueOutlineBorderColor}`,
      }}
    ${(props) =>
      props.$buttonType === "white-outline" && {
        "background-color": props.theme.uiComponents.button.whiteOutlineColor,
        border: `1px solid ${props.theme.uiComponents.button.whiteOutlineBorderColor}`,
      }}
  }
  ${(props) =>
    props.$buttonType === "default" && {
      "background-color":
        props.theme.uiComponents.button.defaultBackgroundColor,
      border: `1px solid ${props.theme.uiComponents.button.defaultBackgroundColor}`,
    }}
  ${(props) =>
    props.$buttonType === "primary" && {
      "background-color": props.theme.uiComponents.button.primaryColor,
      border: "0px",
    }}
  ${(props) =>
    props.$buttonType === "secondary" && {
      "background-color": props.theme.uiComponents.button.secondaryColor,
      border: `1px solid ${props.theme.uiComponents.button.primaryColor}`,
    }}
  ${(props) =>
    props.$buttonType === "colored" && {
      "background-image": props.theme.uiComponents.button.coloredColor,
      border: "0",
    }}
  ${(props) =>
    props.$buttonType === "nobackground" && {
      "background-color": "transparent",
      border: "0",
    }}
  ${(props) =>
    props.$buttonType === "danger" && {
      "background-color":
        props.theme.uiComponents.button.denagerColorBackground,
      border: `1px solid ${props.theme.uiComponents.button.dangerColor}`,
    }}
  ${(props) =>
    props.$disabled && {
      "background-color": props.theme.uiComponents.button.disableColor,
      "background-image": "none",
      border: `1px solid ${props.theme.uiComponents.button.disableColor}`,
      color: props.theme.uiComponents.button.disabledFont,
      cursor: "not-allowed",
    }}
  ${(props) =>
    props.$buttonType === "blue-outline" && {
      "background-color": props.theme.uiComponents.button.blueOutlineColor,
      border: `1px solid ${props.theme.uiComponents.button.blueOutlineBorderColor}`,
    }}
  ${(props) =>
    props.$buttonType === "white-outline" && {
      "background-color": props.theme.uiComponents.button.whiteOutlineColor,
      border: `1px solid ${props.theme.uiComponents.button.whiteOutlineBorderColor}`,
    }}
`;

export const IconDiv = styled.span`
  margin-right: 7px;
`;

export const MergedButtonGroupDiv = styled.div`
  display: initial;
  button {
    border-radius: 0;
    margin: 0;
    &:first-child {
      border-top-left-radius: 7px;
      border-bottom-left-radius: 7px;
      border-right-width: 0.5px;
    }
    &:last-child {
      border-top-right-radius: 7px;
      border-bottom-right-radius: 7px;
      border-left-width: 0.5px;
    }
  }
`;
