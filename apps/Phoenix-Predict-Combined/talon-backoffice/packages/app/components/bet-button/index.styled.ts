import styled from "styled-components";
import { Button } from "antd";
import { PauseOutlined } from "@ant-design/icons";

type ArrowProps = {
  hidden: boolean;
};

const arrowCommonStyles = `
  position: absolute;
  margin-left: 5px;
  border-style: solid;
  border-width: 9px 5px;
  border-color: transparent;
`;

export const ArrowUp = styled.span<ArrowProps>`
  ${arrowCommonStyles}
  border-bottom-color: #00b75b;
  filter: drop-shadow(0px 0px 1px #0d7541);
  opacity: ${({ hidden }) => (hidden ? 0 : 1)};
`;

export const ArrowDown = styled.span<ArrowProps>`
  ${arrowCommonStyles}
  margin-top: 10px;
  border-top-color: #da3931;
  filter: drop-shadow(0px 0px 1px #da3931);
  opacity: ${({ hidden }) => (hidden ? 0 : 1)};
`;

type BetButtonProps = {
  $ishighlighted: boolean;
};

export const BetButton = styled(Button)<BetButtonProps>`
  width: 100%;
  text-align: left;
  background-color: ${(props) =>
    props.$ishighlighted
      ? props.theme.content.fixtureList.highlightedBetButtonBackgroundColor
      : props.theme.content.fixtureList.betButtonBackgroundColor} !important;
  border: ${(props) =>
    props.$ishighlighted
      ? `1px solid ${props.theme.content.fixtureList.highlightedBetButtonBorderColor}`
      : `1px solid ${props.theme.content.fixtureList.betButtonBorderColor}`};
  border-radius: ${(props) => 0.5 * props.theme.baseGutter}px;
  height: ${(props) => 6 * props.theme.baseGutter}px;
  color: ${(props) =>
    props.$ishighlighted
      ? props.theme.content.fixtureList.highlightedBetButtonColor
      : props.theme.content.fixtureList.betButtonColor} !important;

  &:hover,
  :focus,
  :active {
    color: ${(props) =>
      props.$ishighlighted
        ? props.theme.content.fixtureList.highlightedBetButtonColor
        : props.theme.content.fixtureList.betButtonColor} !important;

    border: ${(props) =>
      props.$ishighlighted
        ? `1px solid ${props.theme.content.fixtureList.highlightedBetButtonBorderColor}`
        : `1px solid ${props.theme.content.fixtureList.betButtonBorderColor}`};

    background-color: ${(props) =>
      props.$ishighlighted
        ? props.theme.content.fixtureList.highlightedBetButtonBackgroundColor
        : props.theme.content.fixtureList.betButtonBackgroundColor} !important;

    &:hover {
      color: ${(props) =>
        !props.$ishighlighted
          ? `${props.theme.content.fixtureList.hoverBetButtonColor} !important`
          : "inherit"};
      border: 1px solid
        ${(props) =>
          !props.$ishighlighted
            ? `${props.theme.content.fixtureList.hoverBetButtonBorderColor} !important`
            : "inherit"};
      background-color: ${(props) =>
        !props.$ishighlighted
          ? `${props.theme.content.fixtureList.hoverBetButtonBackgroundColor} !important`
          : "inherit"};
    }
  }
  div {
    padding-right: 0;
  }
  &:disabled {
    border: 1px solid
      ${(props) => props.theme.content.fixtureList.betButtonBorderColor};
    &:hover {
      border: 1px solid
        ${(props) =>
          props.theme.content.fixtureList.highlightedBetButtonBorderColor};
    }
  }
`;

export const SelectionName = styled.div`
  font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  opacity: 0.55;
  text-overflow: ellipsis;
  overflow: hidden;
`;

export const OddsValueContainer = styled.div`
  display: initial;
  font-family: Open Sans, sans-serif;
  font-size: ${(props) => 1.6 * props.theme.baseGutter}px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
`;

export const SuspendedIcon = styled(PauseOutlined)``;
