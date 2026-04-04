import styled from "styled-components";
import { Badge } from "antd";

export const BadgeNoStyles: typeof Badge = styled(Badge)`
  .ant-badge-count {
    color: #999;
    background: none;
    border: none;
    box-shadow: none;
    padding: 0 2px;
    margin-top: -3px;
    font-size: 16px;
  }
`;

export const CurrentBalance = styled.span`
  @media (min-width: 1200px) {
    margin-right: 15px;
  }
  width: max-content;
  color: #999;
  display: inline-block;
  font-size: 16px;
`;
