import styled from "styled-components";
import { Card, Col, Row, Divider } from "antd";

export const StyledCard = styled(Card)`
  background-color: ${(props) =>
    props.theme.content.personalData.backgroundColor};
  margin-right: ${(props) => 2.5 * props.theme.baseGutter}px;
  margin-left: ${(props) => 2.5 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 2.5 * props.theme.baseGutter}px;
  border: none;

  & .ant-card-head {
    margin-left: ${(props) => 4 * props.theme.baseGutter}px;
    padding: 0;
    border: none;
    color: ${(props) => props.theme.content.personalData.mainFontColor};
    font-size: ${(props) => 1.5 * props.theme.baseGutter}px;
  }

  & .ant-card-body {
    padding: 0;
  }
`;

export const InfoRow = styled(Row)`
  height: ${(props) => 7 * props.theme.baseGutter}px;
  @media (max-width: 992px) {
    height: ${(props) => 9 * props.theme.baseGutter}px;
  }

  @media (max-width: 576px) {
    margin-top: ${(props) => props.theme.baseGutter}px;
    margin-bottom: ${(props) => props.theme.baseGutter}px;
  }
  align-items: center;
  align-content: center;
  margin-left: ${(props) => 4 * props.theme.baseGutter}px;
  margin-right: ${(props) => 4 * props.theme.baseGutter}px;
`;

export const NameCol = styled(Col)`
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  @media (max-width: 992px) {
    margin-bottom: ${(props) => 1 * props.theme.baseGutter}px;
  }
  color: ${(props) => props.theme.content.personalData.nameFont};
`;

export const ValueCol = styled(Col)`
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.content.personalData.mainFontColor};
`;

export const ChangeCol = styled(Col)`
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.content.personalData.changeColor};
  text-align: end;
  & span {
    cursor: pointer;
    &:hover {
      color: ${(props) => props.theme.content.personalData.changeHoverColor};
    }
  }
`;

export const ButtonCol = styled(Col)`
  text-align: end;
  @media (max-width: 576px) {
    text-align: initial;
  }
`;

export const StyledDivider = styled(Divider)`
  margin: 0;
  background-color: ${(props) => props.theme.content.personalData.dividerColor};
`;

export const TermsContainer = styled.div`
  display: flex;
  & span {
    color: ${(props) => props.theme.content.personalData.termsDateColor};
  }
`;

export const ErrorContainer = styled(Row)`
  margin-bottom: ${(props) => 2 * props.theme.baseGutter}px;
`;

export const MessageContainer = styled.div`
  font-size: ${(props) => 2 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 3.5 * props.theme.baseGutter}px;
  text-align: center;
  color: ${(props) => props.theme.content.personalData.deleteModalMessageColor};
`;

export const ModalTitle = styled.div`
  width: 100%;
  font-weight: 800;
  text-align: center;
  color: ${(props) => props.theme.content.personalData.deleteModalTitleColor};
  font-size: ${(props) => 2 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 4.5 * props.theme.baseGutter}px;
  margin-top: ${(props) => 4 * props.theme.baseGutter}px;
`;
