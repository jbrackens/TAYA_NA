import styled from "styled-components";

export const Container = styled.table`
  width: 100%;
  tbody {
    td {
      padding: 10px 24px;
    }
  }
  thead {
    tr {
      td {
        padding: 15px 25px;
        font-size: 16px;
        font-weight: 600;
        font-stretch: normal;
        font-style: normal;
        line-height: 1.5;
        letter-spacing: normal;
        color: ${(props) => props.theme.uiComponents.table.headerHighlighted};
      }
    }
  }
`;
