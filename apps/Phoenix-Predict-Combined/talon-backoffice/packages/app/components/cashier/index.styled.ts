import { Drawer } from "antd";
import styled from "styled-components";
import { CoreButton } from "../ui/button";

export const CloseButton = styled(CoreButton)`
  margin: 0px 30px 30px 30px;
  @media (min-width: 450px) {
    display: none;
  }
`;

export const StyledDrawer = styled(Drawer)`
  .ant-drawer-body {
    display: flex;
    flex-flow: column;
  }
`;
