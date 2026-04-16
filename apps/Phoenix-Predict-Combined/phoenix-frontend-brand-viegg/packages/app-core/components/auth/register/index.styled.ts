import styled from "styled-components";
import { Form, Typography, Button, Steps } from "antd";
import { CoreButton } from "../../ui/button";

export const StyledSteps = styled(Steps)`
  & .ant-steps-item-title:after {
    background-color: ${(props) =>
      props.theme.uiComponents.modals.registerModal
        .stepsDividerBackgroundColor} !important;
  }

  & .ant-steps-item-icon {
    background-color: ${(props) =>
      props.theme.uiComponents.modals.registerModal.stepsIconBackgroundColor};
  }

  & .ant-steps-icon {
    color: ${(props) =>
      props.theme.uiComponents.modals.registerModal.stepsIconColor} !important;
  }

  & .ant-steps-item-active {
    & .ant-steps-icon {
      color: ${(props) =>
        props.theme.uiComponents.modals.registerModal
          .stepsIconActiveColor} !important;
    }
    & .ant-steps-item-icon {
      background-color: ${(props) =>
        props.theme.uiComponents.modals.registerModal
          .stepsIconActiveBackgroundColor};
      border: 1px solid
        ${(props) =>
          props.theme.uiComponents.modals.registerModal
            .stepsIconActiveBorderColor} !important;
    }
  }

  & .ant-steps-item-finish {
    & .anticon {
      opacity: 1;
      svg {
        color: ${(props) =>
          props.theme.uiComponents.modals.registerModal.stepsIconFinishedColor};
      }
    }
    & .ant-steps-item-icon {
      background-color: ${(props) =>
        props.theme.uiComponents.modals.registerModal
          .stepsIconFinishedBackgroundColor};
      border: 1px solid
        ${(props) =>
          props.theme.uiComponents.modals.registerModal
            .stepsIconActiveBorderColor} !important;
    }
  }

  //prevent layout change
  flex-direction: row;
  display: flex;
  & .ant-steps-item-tail {
    display: none !important;
  }
`;

export const FormItemWithSmallerMarginBottom: typeof Form.Item = styled(
  Form.Item,
)`
  margin-bottom: 20px;
`;

export const StepTitle: typeof Typography.Title = styled(Typography.Title)`
  margin: 15px 0 20px 0;
  text-align: center;
`;

export const LoginInfoContainer = styled.div`
  margin-top: ${(props) => props.theme.baseGutter}px;
  margin-bottom: ${(props) => props.theme.baseGutter}px;
  text-align: center;
  color: ${(props) =>
    props.theme.uiComponents.modals.registerModal.loginInfoColor};
`;

export const NextButton = styled(CoreButton)`
  margin-top: ${(props) => 2 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => props.theme.baseGutter}px;
`;

export const LoginButton = styled(Button)`
  border-radius: ${(props) => 0.5 * props.theme.baseGutter}px;
  background-color: ${(props) =>
    props.theme.uiComponents.modals.registerModal.loginButtonBackgroundColor};
  border: none;
  margin-top: ${(props) => props.theme.baseGutter}px;
  color: ${(props) =>
    props.theme.uiComponents.modals.registerModal.loginButtonColor};

  &:active,
  :focus {
    background-color: ${(props) =>
      props.theme.uiComponents.modals.registerModal.loginButtonBackgroundColor};
    color: ${(props) =>
      props.theme.uiComponents.modals.registerModal.loginButtonColor};
  }

  &:hover {
    background-color: ${(props) =>
      props.theme.uiComponents.modals.registerModal
        .loginButtonHoverBackgroundColor};
    color: ${(props) =>
      props.theme.uiComponents.modals.registerModal.loginButtonColor};
  }
`;

export const BackButton = styled(Button)`
  border-radius: ${(props) => 0.5 * props.theme.baseGutter}px;
  background-color: ${(props) =>
    props.theme.uiComponents.modals.registerModal
      .backButtonButtonBackgroundColor};
  border: none;
  color: ${(props) =>
    props.theme.uiComponents.modals.registerModal.backButtonColor};

  &:active,
  :focus {
    background-color: ${(props) =>
      props.theme.uiComponents.modals.registerModal
        .backButtonButtonBackgroundColor};
    color: ${(props) =>
      props.theme.uiComponents.modals.registerModal.backButtonColor};
  }

  &:hover {
    background-color: ${(props) =>
      props.theme.uiComponents.modals.registerModal
        .backButtonButtonBackgroundHoverColor};
    color: ${(props) =>
      props.theme.uiComponents.modals.registerModal.backButtonColor};
  }
`;

export const TitleNameContainer = styled.div`
  display: flex;
`;

export const TermsLink = styled.a`
  color: ${(props) => props.theme.uiComponents.modals.registerModal.linkColor};
  font-size: ${(props) => 1 * props.theme.baseGutter}px;
  &:hover {
    color: ${(props) =>
      props.theme.uiComponents.modals.registerModal.linkHoverColor};
  }
`;

export const ProhibitedEmployeeForm = styled.div`
  color: ${(props) => props.theme.globalForm.fontColor};
  margin-top: ${(props) => 1 * props.theme.baseGutter}px;
  font-size: ${(props) => 1 * props.theme.baseGutter}px;

  span:first-child {
    * {
      opacity: 0;
      pointer-events: none;
      cursor: default;
    }
  }
  span {
    cursor: default;
  }
`;
