import styled from "styled-components";
import { Row, Typography } from "antd";

export const DropdownsContainer = styled(Row)`
  margin-bottom: ${(props) => 1.7 * props.theme.baseGutter}px !important;
  margin-right: ${(props) => 2.5 * props.theme.baseGutter}px !important;
  margin-left: ${(props) => 2.5 * props.theme.baseGutter}px !important;
  & .ant-typography {
    margin-left: 0px !important;
  }
  & .ant-select-selector {
    padding: 0 !important;
  }
`;

export const SecondaryTitle = styled(Typography.Title)`
  margin-left: ${(props) => 2.5 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.content.account.pageSubtitleColor} !important;
  font-size: ${(props) => props.theme.baseGutter}px !important;
  @media (max-width: 1200px) {
    margin-bottom: ${(props) => 2.5 * props.theme.baseGutter}px !important;
  }
`;

interface Props extends React.HTMLAttributes<HTMLElement> {}

export const SecondaryTitleLink = styled(SecondaryTitle)<Props>`
  color: ${(props) => props.theme.globalForm.linkColor} !important;
  cursor: pointer;

  & :hover {
    color: ${(props) => props.theme.globalForm.linkHoverColor} !important;
  }
`;
