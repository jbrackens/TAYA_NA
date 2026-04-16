import styled from "styled-components";
import { Col, Row } from "antd";

export const ButtonColumn = styled(Col)`
  height: ${(props) => 6 * props.theme.baseGutter}px;
  display: flex;
  justify-content: center;
  border-right: 1px solid
    ${(props) => props.theme.footer.mobileFooterBorderColor};
  border-top: 2px solid ${(props) => props.theme.footer.mobileFooterBorderColor};
  text-align: center;
  cursor: pointer;
  color: ${(props) => props.theme.footer.mobileFooterFontColor};

  &:hover {
    color: ${(props) => props.theme.footer.mobileFooterHoverColor};
  }

  & img {
    height: ${(props) => 1.5 * props.theme.baseGutter}px;
  }
`;

type RowContainerProps = {
  $isVisible: boolean;
};

export const RowContainer = styled(Row)<RowContainerProps>`
  background-color: ${(props) =>
    props.theme.footer.mobileFooterColor} !important;
  color: ${(props) => props.theme.footer.fontColor} !important;
  @media (max-width: 1200px) {
    display: flex;
    transform: ${(props) =>
      props.$isVisible ? "translatey(0)" : "translatey(100%)"};
  }
  display: none;
  transform: translateY(0);
  transition: transform 0.4s;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-width: 100vw;
  justify-content: space - around;
  align-items: center;
  z-index: 120;
  background-color: white;
`;
