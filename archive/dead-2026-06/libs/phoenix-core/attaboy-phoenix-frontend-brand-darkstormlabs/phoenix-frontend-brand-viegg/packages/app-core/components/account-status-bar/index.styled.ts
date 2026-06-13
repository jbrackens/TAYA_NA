import styled from "styled-components";
import { CoreAlert } from "../ui/alert";

export const AccountStatusBarStyled: typeof CoreAlert = styled(CoreAlert)`
  padding: ${(props) => props.theme.baseGutter}px !important;
  margin-left: ${(props) => props.theme.baseGutter}px;
  margin-right: ${(props) => props.theme.baseGutter}px;
  margin-bottom: ${(props) => props.theme.baseGutter}px;
  display: flex;

  & .ant-alert-message {
    margin-right: ${(props) => props.theme.baseGutter}px;
    font-weight: bold;
    margin-bottom: 0;
    display: inline;
  }

  & .ant-alert-description {
    display: inline;
    opacity: 0.5;
    & div,
    span {
      display: inline !important;
    }
  }

  &.ant-alert-error {
    background-color: ${(props) =>
      props.theme.statusBar.selfExcludeBackgroundColor};
    border: 1px solid ${(props) => props.theme.statusBar.selfExcludeBorderColor};

    & .ant-alert-message {
      color: ${(props) => props.theme.statusBar.messageColor};
    }

    & .ant-alert-description {
      color: ${(props) => props.theme.statusBar.messageColor} !important;
      & div,
      span {
        color: ${(props) => props.theme.statusBar.messageColor} !important;
      }
    }
  }

  &.ant-alert-warning {
    background-color: ${(props) =>
      props.theme.statusBar.coolOffBackgroundColor};
    border: 1px solid ${(props) => props.theme.statusBar.coolOffBorderColor};

    & .ant-alert-message {
      color: ${(props) => props.theme.statusBar.messageColor};
    }

    & .ant-alert-description {
      color: ${(props) => props.theme.statusBar.messageColor} !important;
      & div,
      span {
        color: ${(props) => props.theme.statusBar.messageColor} !important;
      }
    }
  }
`;
