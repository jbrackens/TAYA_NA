import styled from "styled-components";
import { Row, Tabs } from "antd";

export const TabsUserDetails = styled(Tabs)`
  .ant-tabs-nav {
    margin-bottom: 0;
  }
`;

export const DescriptionItemText = styled.span`
  margin-right: 5px;
`;

export const DescriptionItemLink = styled.a`
  margin-right: 10px;
  &.extra-left {
    margin-left: 10px;
  }
  svg {
    margin-right: 2px;
  }
`;

export const UserDetailsRow = styled(Row)`
  .ant-tabs-content,
  .ant-card,
  .ant-tabs {
    height: 100%;
  }
`;
