import styled from "styled-components";
import { Modal } from "antd";

export const BaseModal = styled(Modal)`
  & .ant-modal-content {
    background-color: ${(props) =>
      props.theme.uiComponents.modals.backgroundColor};
  }

  & .ant-modal-body {
    display: flex;
    justify-content: center;
    padding-left: ${(props) => 5 * props.theme.baseGutter}px;
    padding-right: ${(props) => 5 * props.theme.baseGutter}px;
  }

  & .ant-modal-header {
    border-radius: 10px;
    background-color: ${(props) =>
      props.theme.uiComponents.modals.loginModal.headerBackgroundColor};
    border: none;
    & .ant-modal-title {
      color: ${(props) =>
        props.theme.uiComponents.modals.loginModal.headerColor};
    }
  }

  & .ant-modal-close-x {
    color: ${(props) => props.theme.uiComponents.modals.loginModal.headerColor};
    opacity: 0.48;
  }

  & .ant-modal-footer {
    border-top: none;
    padding-bottom: 20px;
    button {
      display: initial;
      /* Display Footer Buttons full width in mobile devices */
      @media (max-width: 768px) {
        /* Overrides the existing margin by the ant design library */
        &.ant-btn + .ant-btn:not(.ant-dropdown-trigger) {
          margin: 5px 0;
        }
        width: 100%;
        margin: 5px 0;
      }
    }
  }

  & p {
    color: ${(props) => props.theme.uiComponents.modals.paragraphColor};
  }
`;
