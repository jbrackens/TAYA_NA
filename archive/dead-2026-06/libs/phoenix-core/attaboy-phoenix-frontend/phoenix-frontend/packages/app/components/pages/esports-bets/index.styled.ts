import styled from "styled-components";
import { Carousel, Card, Col } from "antd";
import { SelectContainer } from "../../ui/form/index.styled";
import {
  LandingSectionContainer,
  TextContainer,
  ImageContainer,
} from "../../../components/landing-page-components/index.styled";

export const StyledCarousel = styled(Carousel)`
  margin-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  margin-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  .slick-slide > div {
    margin: 0 5px 10px 5px;
  }
  .slick-list {
    margin: 0 -5px;
  }
  ${LandingSectionContainer} {
    padding-bottom: 30px;
    padding-top: 40px;
    ${TextContainer} {
      width: 50%;

      @media (max-width: 768px) {
        width: 100%;
      }
    }
    ${ImageContainer} {
      width: 50%;
      @media (max-width: 768px) {
        width: 100%;
      }
    }
  }
`;

export const PageTitleContainer = styled.div`
  display: flex;
  margin-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  margin-top: ${(props) => 1.5 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 1.5 * props.theme.baseGutter}px;
  &:first-child {
    margin-left: ${(props) => 1 * props.theme.baseGutter}px;
  }
`;

export const OddsFormatSelectContainer = styled.div`
  ${SelectContainer} {
    display: inline-block;
    width: ${(props) => 15 * props.theme.baseGutter}px;
    margin-right: ${(props) => 1 * props.theme.baseGutter}px;
    @media (max-width: 400px) {
      width: ${(props) => 10 * props.theme.baseGutter}px;
    }
  }
`;

export const SelectLabelContainer = styled.span`
  margin-left: auto;
  align-self: center;
  margin-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.content.fixtureList.mainFontColor};
  @media (max-width: 400px) {
    margin-right: ${(props) => 0 * props.theme.baseGutter}px;
  }
`;

export const PageTitle = styled.span`
  font-size: ${(props) => 1.6 * props.theme.baseGutter}px;
  align-self: center;
  margin-left: ${(props) => 1.5 * props.theme.baseGutter}px;
`;

export const FixtureListContainer = styled(Card)`
  margin-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  margin-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  background-color: ${(props) =>
    props.theme.content.fixtureList.backgroundColor};
  color: ${(props) => props.theme.content.fixtureList.mainFontColor};
  border: none;
  & .ant-list .ant-list-item {
    color: ${(props) =>
      props.theme.content.fixtureList.mainFontColor} !important;
  }

  & .ant-tabs-top {
    background-color: ${(props) =>
      props.theme.content.fixtureList.tabsContainerBackgroundColor};
  }

  & .ant-tabs-nav {
    margin: 0;
    margin-left: ${(props) => 1.6 * props.theme.baseGutter}px;
  }

  & .ant-tabs-nav-wrap {
    background-color: ${(props) =>
      props.theme.content.fixtureList.tabsContainerBackgroundColor};
  }

  & .ant-tabs-nav:before {
    border-bottom: 1px solid
      ${(props) => props.theme.content.fixtureList.dividerColor};
  }

  & .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: ${(props) => props.theme.content.fixtureList.mainFontColor};
    font-size: ${(props) => 1.6 * props.theme.baseGutter}px;
    font-weight: bold;
    font-style: normal;
  }

  & .ant-tabs-tab-btn {
    color: ${(props) => props.theme.content.fixtureList.inactiveTabColor};
    font-size: ${(props) => 1.6 * props.theme.baseGutter}px;
    font-weight: normal;
    font-style: normal;
  }

  & .ant-tabs-ink-bar {
    background-color: ${(props) =>
      props.theme.content.fixtureList.activeTabBorderBottom} !important;
  }

  & .ant-card-body {
    padding: 0 !important;
  }

  & .ant-tabs-tab,
  .ant-tabs-tab-active {
  }
`;

export const ColumnNoPadding = styled(Col)`
  padding: 0 !important;
`;
