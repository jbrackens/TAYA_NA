import styled from "styled-components";
import { Typography } from "antd";

export const StaticPageContainer = styled.div`
  background-color: ${(props) =>
    props.theme.content.staticPage.containerBackgroundColor};
  margin-left: ${(props) => 1.8 * props.theme.baseGutter}px !important;
  margin-right: ${(props) => 1.8 * props.theme.baseGutter}px !important;
  margin-top: ${(props) => 0.3 * props.theme.baseGutter}px !important;
  margin-bottom: ${(props) => 5 * props.theme.baseGutter}px !important;
  padding-left: ${(props) => 3 * props.theme.baseGutter}px !important;
  padding-right: ${(props) => 3 * props.theme.baseGutter}px !important;
  padding-top: ${(props) => 3 * props.theme.baseGutter}px !important;
  padding-bottom: ${(props) => 2 * props.theme.baseGutter}px !important;

  h1 {
    color: ${(props) => props.theme.content.staticPage.titleColor};
  }

  h2,
  h3,
  h4,
  h6 {
    color: ${(props) => props.theme.content.staticPage.subtitleColor};
  }

  h5 {
    color: ${(props) => props.theme.content.staticPage.h5Color};
    font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
    font-weight: bold;
    font-stretch: normal;
    font-style: normal;
    line-height: 1.58;
    letter-spacing: normal;
  }

  table {
    font-size: 12px;
    font-weight: bold;
    font-stretch: normal;
    font-style: normal;
    line-height: 1.58;
    letter-spacing: normal;
    border-spacing: 0;
    border-collapse: no-collapse;
  }

  table th {
    border-right: 1px solid
      ${(props) => props.theme.content.staticPage.table.thBorderColor};
    border-left: 1px solid
      ${(props) => props.theme.content.staticPage.table.thBackgroundColor};
    & :last-child {
      border-right: 1px solid transparent;
    }
  }

  td,
  th {
    width: ${(props) => 20.9 * props.theme.baseGutter}px;
    height: ${(props) => 5.2 * props.theme.baseGutter}px;
    text-align: center;
    vertical-align: middle;
  }

  th {
    border-top: 1px solid
      ${(props) => props.theme.content.staticPage.table.thBackgroundColor};
    background-color: ${(props) =>
      props.theme.content.staticPage.table.thBackgroundColor};
    color: ${(props) => props.theme.content.staticPage.table.thColor};

    & :before,
    :after {
      box-sizing: border-box;
    }
  }

  td {
    background-color: ${(props) =>
      props.theme.content.staticPage.table.tdBackgroundColor};
    color: ${(props) => props.theme.content.staticPage.table.tdColor};
    border-left: 1px solid
      ${(props) => props.theme.content.staticPage.table.tdSideBorders};
    border-right: 1px solid
      ${(props) => props.theme.content.staticPage.table.tdSideBorders};
    border-bottom: 1px solid
      ${(props) => props.theme.content.staticPage.table.rowsDividerColor};
  }

  table tr:last-child {
    border-right: 1px solid
      ${(props) => props.theme.content.staticPage.table.rowBottomBorderColor};
  }

  table tr:first-child {
    border-top: 1px solid
      ${(props) => props.theme.content.staticPage.table.rowTopBorderColor};
  }

  li {
    color: ${(props) => props.theme.content.staticPage.list.liColor};
    font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
    font-weight: normal;
    font-stretch: normal;
    font-style: normal;
    line-height: 1.58;
    letter-spacing: normal;
  }

  ul {
    padding: 0;
    margin-left: ${(props) => 1.5 * props.theme.baseGutter}px;
    li {
      & ::marker {
        color: ${(props) =>
          props.theme.content.staticPage.list.markerColor} !important;
      }
    }
  }

  ol {
    padding: 0;
    margin-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  }

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

type TitleProps = {
  $hasSubtitle: boolean;
};

export const StyledTitle = styled(Typography.Title)<TitleProps>`
  color: ${(props) => props.theme.content.staticPage.titleColor} !important;
  font-size: ${(props) => 2.4 * props.theme.baseGutter}px !important;
  margin-bottom: ${(props) =>
    props.$hasSubtitle
      ? 0.8 * props.theme.baseGutter
      : 4.2 * props.theme.baseGutter}px !important;

  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.46;
  letter-spacing: normal;
`;

export const StyledSubtitle = styled.div`
  color: ${(props) => props.theme.content.staticPage.subtitleColor};
  text-align: left !important;
  font-size: ${(props) => 1.2 * props.theme.baseGutter}px !important;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.25;
  letter-spacing: normal;
  text-align: center;
  margin-bottom: ${(props) => 4.2 * props.theme.baseGutter}px !important;
`;
