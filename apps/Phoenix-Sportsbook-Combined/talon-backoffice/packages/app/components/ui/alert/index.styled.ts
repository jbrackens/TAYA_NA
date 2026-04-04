import { Alert } from "antd";
import styled from "styled-components";

export const BaseAlert = styled(Alert)`
  background-color: ${(props) =>
    props.theme.globalForm.alertBackgroundColor
      ? props.theme.globalForm.alertBackgroundColor
      : "red"};
  border: none;
  border-radius: 5px;
  text-align: center;
  .ant-alert-message {
    color: ${(props) => props.theme.globalForm.alertColor};
  }
  .anticon {
    display: none;
  }
`;
