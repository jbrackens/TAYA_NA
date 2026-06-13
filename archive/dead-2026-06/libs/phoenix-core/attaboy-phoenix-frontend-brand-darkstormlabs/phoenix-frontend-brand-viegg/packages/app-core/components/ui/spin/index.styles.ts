import styled from "styled-components";
import { Spin } from "antd";

export const BaseSpin = styled(Spin)`
  background-color: ${(props) => props.theme.spinnerContainerBackgroundColor};
  margin-top: ${(props) => 10 * props.theme.baseGutter}px;
  .ant-spin-dot-item {
    background-color: ${(props) => props.theme.spinnerBackgroundColor};
  }
`;
