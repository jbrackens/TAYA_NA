import styled from "styled-components";

export const TableRowContainer = styled.tr`
  color: ${(props) => props.theme.uiComponents.table.fontColor};
  border-bottom: 1px solid
    ${(props) => props.theme.uiComponents.table.borderColor};
`;

export const TableHeaderContainer = styled.thead`
  tr {
    color: ${(props) => props.theme.uiComponents.table.headerFontColor};
  }
`;

export const TableBodyContainer = styled.tbody`
  tr:last-child {
    border-bottom: none;
  }
`;

type TableColContainer = {
  widthPercentage?: number;
  align?: "left" | "right" | "center";
};

export const TableColContainer = styled.td<TableColContainer>`
  padding: 10px 15px;
  ${(props) => props.widthPercentage && { width: props.widthPercentage + "%" }};
  text-align: ${(props) => props.align};
`;

type TableContainerProps = {
  stripped?: boolean;
};
export const TableContainer = styled.table<TableContainerProps>`
  border-radius: 12px;
  overflow: hidden;
  font-size: 14px;
  width: 100%;
  border: none;
  table-layout: fixed;
  border-collapse: collapse;
  ${TableRowContainer} {
    background-color: ${(props) =>
      props.stripped
        ? props.theme.uiComponents.table.strippedColor1
        : props.theme.uiComponents.table.rowBackgroundColor};
    &:nth-child(even) {
      background-color: ${(props) =>
        props.stripped
          ? props.theme.uiComponents.table.strippedColor2
          : props.theme.uiComponents.table.rowBackgroundColor};
    }
  }
  ${TableHeaderContainer} {
    tr {
      background-color: ${(props) =>
        props.stripped
          ? props.theme.uiComponents.table.strippedColor1
          : props.theme.uiComponents.table.headerBackgroundColor};
    }
  }
`;
