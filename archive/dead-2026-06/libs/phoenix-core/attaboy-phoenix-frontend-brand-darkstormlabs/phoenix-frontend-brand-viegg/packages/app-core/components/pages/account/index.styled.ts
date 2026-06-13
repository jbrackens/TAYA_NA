import styled from "styled-components";
import { Typography } from "antd";

type StyledTitleProps = {
  $subtitleexists?: boolean;
};

export const StyledTitle = styled(Typography.Title)<StyledTitleProps>`
  color: ${(props) => props.theme.content.account.titleColor} !important;
  font-size: ${(props) => 2.5 * props.theme.baseGutter}px !important;
  margin-left: ${(props) => 2.5 * props.theme.baseGutter}px !important;
  margin-top: ${(props) => 2.5 * props.theme.baseGutter}px !important;
  margin-bottom: ${(props) =>
    props.$subtitleexists
      ? 0.5 * props.theme.baseGutter
      : 2.5 * props.theme.baseGutter}px !important;
`;
