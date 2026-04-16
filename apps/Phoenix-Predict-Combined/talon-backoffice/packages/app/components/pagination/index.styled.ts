import styled from "styled-components";
import { Pagination } from "antd";

export const StyledPagination = styled(Pagination)`
  text-align: center;
  margin-top: ${(props) => 4 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 4 * props.theme.baseGutter}px;
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
