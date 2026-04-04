import { Switch } from "antd";
import styled from "styled-components";

export const BaseSwitch = styled(Switch)`
  background-color: ${(props) => props.theme.globalForm.switchBackgroundColor};
  box-shadow: none !important;
  outline-color: transparent !important;

  .anticon {
    display: none;
  }

  .ant-switch-handle:before {
    background-color: ${(props) => props.theme.globalForm.switchUncheckedColor};
  }

  .ant-click-animating-node {
    display: none;
  }

  &.ant-switch-checked {
    .ant-switch-handle:before {
      background-color: ${(props) => props.theme.globalForm.switchCheckedColor};
    }
  }
`;
