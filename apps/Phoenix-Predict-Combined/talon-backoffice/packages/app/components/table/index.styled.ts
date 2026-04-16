import styled from "styled-components";
import { Table } from "antd";

export const StyledTable = styled(Table)`
  //removing tr hover effect
  .ant-table-tbody > tr.ant-table-row:hover > td {
    background: unset;
  }

  .ant-table-empty {
    table,
    td {
      border: none;
    }
  }

  table {
    border-collapse: separate;
    border: 1px solid ${(props) => props.theme.content.table.tdSideBordersColor};
    border-top: none;
  }

  th {
    background-color: ${(props) =>
      props.theme.content.table.thBackgroundColor} !important;
    color: ${(props) => props.theme.content.table.thColor} !important;
    border: none !important;
    text-align: center !important;
    border-radius: 0 !important;
  }

  td {
    text-align: center;
    border: 1px solid ${(props) => props.theme.content.table.tdSideBordersColor};
    border-bottom: none !important;
  }

  tr {
    color: ${(props) => props.theme.content.table.cellColor};
    :nth-child(2n) td {
      background-color: ${(props) =>
        props.theme.content.table.trNthChildBackgroundColor} !important;
    }

    :nth-child(n) {
      background-color: ${(props) =>
        props.theme.content.table.tr2NthChildBackgroundColor};
    }
  }

  & .ant-pagination-item-link,
  .ant-pagination-item {
    background-color: transparent;
    border: none;
    & span,
    a {
      color: ${(props) => props.theme.pagination.arrowColor};
    }
  }

  & .ant-pagination-item-active {
    border: 1px solid
      ${(props) => props.theme.pagination.selectedItemBackgroundColor};
    border-radius: 50%;
    background-color: ${(props) =>
      props.theme.pagination.selectedItemBackgroundColor};

    a {
      color: ${(props) => props.theme.pagination.selectedItemNumberColor};
    }
  }

  & .ant-pagination-disabled {
    & span {
      color: ${(props) => props.theme.pagination.disabledArrowColor};
    }
  }
`;

export const EmptyDataContainer = styled.div`
  padding: ${(props) => 4 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.content.table.cellColor};
`;
