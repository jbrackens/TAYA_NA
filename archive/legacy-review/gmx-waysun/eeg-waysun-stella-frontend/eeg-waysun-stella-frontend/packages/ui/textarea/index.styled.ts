import styled from "styled-components";

type StyledInputProps = {
  $fullWidth: boolean | undefined;
};
export const StyledTextarea = styled.textarea<StyledInputProps>`
  box-sizing: border-box;
  width: ${(props) => (props.$fullWidth ? "100%" : "auto")};
  padding: 10px 15px;
  border-radius: 7px;
  font-size: 17px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.41;
  letter-spacing: normal;
  background-color: ${(props) => props.theme.uiComponents.input.background};
  box-shadow: 0px 1px 0px rgba(50, 50, 50, 0.25),
    inset 0px 2px 1px rgba(0, 0, 0, 0.25);
  border: 1px solid ${(props) => props.theme.uiComponents.input.background};
  color: ${(props) => props.theme.uiComponents.input.fontColor};
  &:hover {
    border: 1px solid
      ${(props) =>
        props.disabled
          ? props.theme.uiComponents.input.background
          : props.theme.uiComponents.general.hoverBorderColor};
  }
  &:focus {
    outline: 1px solid
      ${(props) => props.theme.uiComponents.general.hoverBorderColor};
    border: 1px solid
      ${(props) => props.theme.uiComponents.general.hoverBorderColor};
  }
  &:disabled {
    cursor: not-allowed;
  }
`;

export const TextareaWrapper = styled.div`
  padding: 0;
`;

export const TextareaLabel = styled.label`
  display: block;
  font-size: 14px;
  color: ${(props) => props.theme.uiComponents.input.labelColor};
  margin-bottom: 8px;
`;

type ErrorProps = {
  $show: boolean;
};
export const TextareaError = styled.div<ErrorProps>`
  padding-left: 2px;
  visibility: ${(props) => (props.$show ? "initial" : "hidden")};
  color: ${(props) => props.theme.uiComponents.input.errorColor};
  font-size: 11px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 2.18;
  letter-spacing: normal;
  min-height: 25px;
`;

export const LoaderDiv = styled.div`
  width: 100%;
  position: absolute;
  top: 20px;
  left: 10px;
`;

type DivProps = {
  $fullWidth?: boolean;
};
export const TextAreaFieldDiv = styled.div<DivProps>`
  position: relative;
  display: ${(props) => (props.$fullWidth ? "block" : "inline-block")};
`;
