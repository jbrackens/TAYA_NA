import styled from "styled-components";
import { Badge } from "antd";

export const BadgeNoStyles: typeof Badge = styled(Badge)`
  .ant-badge-count {
    color: var(--sb-text-primary);
    background: none;
    border: none;
    box-shadow: none;
    padding: 0 2px;
    margin-top: -3px;
    font-size: 14px;
    font-weight: 600;
  }
`;

export const CurrentBalance = styled.span`
  @media (min-width: 1200px) {
    margin-right: 8px;
  }
  width: max-content;
  color: var(--sb-text-primary);
  display: inline-block;
  font-size: 14px;
`;
