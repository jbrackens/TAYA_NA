import styled from "styled-components";
import { ScrollbarStyle } from "ui";

export const DateWrapper = styled.div`
  width: auto;
`;

export const CalenderContainer = styled.div`
  z-index: 2;
  position: absolute;
  background-color: ${(props) =>
    props.theme.uiComponents.calender.containerBackground};
  color: white;
  display: flex;
  flex-direction: column;
  max-width: 250px;
  max-height: 280px;
  border-radius: 5px;
  z-index: 5;
`;

export const Header = styled.div`
  border-bottom: 1px solid
    ${(props) => props.theme.uiComponents.calender.borderColor};
  display: flex;
  position: relative;
  padding: 12px 0;
  text-align: center;
  .calender-select {
    button {
      min-height: unset;
      padding: 1px 5px;
    }
  }
`;

export const YearDiv = styled.div`
  text-align: right;
  flex-basis: 40%;
  margin-right: 3px;
`;

export const MonthDiv = styled.div`
  text-align: left;
  flex-basis: 40%;
  margin-left: 3px;
`;

export const TabDiv = styled.div`
  flex-grow: 1;
  text-align: right;
  a {
    position: absolute;
    right: 5%;
    top: 50%;
    transform: translate(0, -50%);
  }
`;

export const Content = styled.table`
  width: 100%;
  border-spacing: 10px 0;
  height: 100%;
  table-layout: fixed;
`;

type tdProps = {
  faded?: boolean;
  header?: boolean;
  selected?: boolean;
};
export const TableTd = styled.td<tdProps>`
  text-align: center;
  font-size: 14px;
`;

export const TableTdDiv = styled.div<tdProps>`
  border-radius: 2px;
  cursor: ${(props) => (props.header ? "auto" : "pointer")};
  padding: 5px 2px;
  color: ${(props) =>
    props.faded
      ? props.theme.uiComponents.calender.fontColorDark
      : props.theme.uiComponents.calender.fontColor};
  width: 100%;
  &:hover {
    background-color: ${(props) =>
      props.header ? "none" : props.theme.uiComponents.calender.hoverColor};
  }
  ${(props) =>
    props.selected && {
      outline: `1px solid ${props.theme.uiComponents.calender.selectColor}`,
    }};
`;

export const ContentYear = styled.div`
  display: flex;
  flex-wrap: wrap;
  ${ScrollbarStyle}
  justify-content: center;
`;

export const ContentYearOptions = styled.button`
  max-height: 30px;
  text-align: center;
  background: none;
  color: inherit;
  border: none;
  padding: 7px 10px;
  font: inherit;
  cursor: pointer;
  outline: inherit;
  border-radius: 3px;
  &:hover {
    background-color: ${(props) =>
      props.theme.uiComponents.calender.hoverColor};
  }
`;
