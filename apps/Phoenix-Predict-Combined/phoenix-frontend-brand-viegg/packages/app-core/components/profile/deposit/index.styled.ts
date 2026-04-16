import styled from "styled-components";
import { Card, Row, Col } from "antd";
import { CoreButton } from "../../ui/button";

export const CardWithBorderBottom = styled(Card)`
  margin-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  margin-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  border-bottom: 1px solid
    ${(props) => props.theme.content.account.limits.dividerColor};
  & .ant-card-body {
    padding: ${(props) => 2.5 * props.theme.baseGutter}px;
    & .ant-form-item-extra {
      margin-top: ${(props) => props.theme.baseGutter}px;
      color: ${(props) =>
        props.theme.content.account.limits.textUnderInputColor};
      @media (max-width: 1200px) {
        margin-bottom: ${(props) => 2 * props.theme.baseGutter}px;
      }
    }
    & .ant-form-item-label {
      & > label {
        font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
        font-weight: bold;
        font-stretch: normal;
        font-style: normal;
        color: ${(props) =>
          props.theme.content.account.limits.mainFontColor} !important;
        &:before {
          display: none !important;
        }
      }
    }
    background-color: ${(props) =>
      props.theme.content.account.limits.backgroundColor};
  }
`;

export const MessageContainer = styled(Col)`
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.content.account.limits.mainFontColor};
  display: flex;
  align-self: center;
  @media (max-width: 768px) {
    justify-content: center;
    margin-top: ${(props) => props.theme.baseGutter}px;
  }
`;

export const RowMarginTop = styled(Row)`
  margin-top: ${(props) => 2.5 * props.theme.baseGutter}px;
`;

export const LimitsTitle = styled(Col)`
  font-weight: bold;
  color: ${(props) => props.theme.content.account.limits.limitsTitleColor};
  margin-bottom: ${(props) => 2 * props.theme.baseGutter}px;
`;

export const ButtonMarginTopOverflowHidden = styled(CoreButton)`
  margin-top: ${(props) => 1 * props.theme.baseGutter}px;
  & span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export const BreakMessage = styled(Col)`
  color: ${(props) => props.theme.content.account.limits.breakMessageColor};
  font-size: ${(props) => 2 * props.theme.baseGutter}px;
`;

export const SaveButton = styled(CoreButton)`
  width: 100%;
`;

export const CancelButton = styled(CoreButton)`
  margin-top: ${(props) => -props.theme.baseGutter}px;
`;

export const BreakTimeContainer = styled.div`
  color: ${(props) => props.theme.content.account.limits.breakTimeInfoColor};
  & span {
    color: ${(props) => props.theme.content.account.limits.breakTimeColor};
    margin-left: ${(props) => 0.5 * props.theme.baseGutter}px;
  }
`;

export const MarginLeftRightContainer = styled.div`
  margin-right: ${(props) => 1 * props.theme.baseGutter}px;
  margin-left: ${(props) => 1 * props.theme.baseGutter}px;
  p {
    color: ${(props) => props.theme.content.staticPage.paragraphColor};
    font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
    font-weight: normal;
    font-stretch: normal;
    font-style: normal;
    line-height: 1.58;
    letter-spacing: normal;
  }
`;
