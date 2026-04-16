import styled from "styled-components";
import { Card, Col } from "antd";
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

export const SubTitle = styled(Col)`
  font-weight: bold;
  color: ${(props) => props.theme.content.account.limits.limitsTitleColor};
  margin-bottom: ${(props) => 2 * props.theme.baseGutter}px;
`;

export const BreakButton = styled(CoreButton)`
  margin-top: ${(props) => 1 * props.theme.baseGutter}px;
  & span {
    overflow: hidden;
    text-overflow: ellipsis;
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
