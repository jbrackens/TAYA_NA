import styled from "styled-components";
import { Layout, Col } from "antd";
import Avatar from "antd/lib/avatar/avatar";

export const MainFooterContainer = styled(Layout.Footer)`
  font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.footer.mainFooterfontColor};
  background-color: ${(props) => props.theme.footer.mainFooterColor};
  @media (min-width: 1200px) {
    background-color: ${(props) => props.theme.footer.lowerFooterColor};
    padding-left: ${(props) => 24 * props.theme.baseGutter}px;
  }
`;

export const IconContainer = styled(Avatar)`
  background-color: ${(props) => props.theme.footer.socialIconsColor};
  cursor: pointer;
  margin-right: ${(props) => 1 * props.theme.baseGutter}px;

  & img {
    height: ${(props) => 1.5 * props.theme.baseGutter}px;
  }

  &:hover {
    color: ${(props) => props.theme.footer.socialIconsHoverColor};
  }
`;

export const ContentCol = styled(Col)`
  text-align: left;
  @media (min-width: 1200px) {
    padding-left: ${(props) => 10 * props.theme.baseGutter}px;
  }
`;
