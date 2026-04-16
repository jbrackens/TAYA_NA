import styled from "styled-components";

export const PADDING_SIZE = 48;

export const TableWrapper = styled.div<{ ref: any }>`
  height: 100%;
  margin: ${-1 * PADDING_SIZE}px ${-1 * PADDING_SIZE}px;

  .ant-table-header,
  .ant-table-body,
  .ant-table-footer {
    &>table {
      col {
        &.ant-table-expand-icon-col {
          width: ${0.8 * PADDING_SIZE + 48}px;
        }
      }

      &>thead,
      &>tbody,
      &>tfoot {
        &>tr {
          &>th {
            &:first-child {
              padding-left: ${0.8 * PADDING_SIZE}px;
            }

            &:last-child {
              padding-right: ${0.8 * PADDING_SIZE}px;
            }
          }

          &>td {
            &:first-child {
              padding-left: ${1.2 * PADDING_SIZE}px;
            }

            &:last-child {
              padding-right: ${1.2 * PADDING_SIZE}px;
            }
          }
        }
      }
    }
  }

  .ant-table-pagination {
    padding: ${0.25 * PADDING_SIZE}px ${PADDING_SIZE}px;
  }
`;
