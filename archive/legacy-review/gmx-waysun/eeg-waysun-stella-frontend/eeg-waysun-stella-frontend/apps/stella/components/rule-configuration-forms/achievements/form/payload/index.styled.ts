import { Col } from "antd";
import styled from "styled-components";
import { Container } from "../../../../table-container/index.styled";

export const PayloadContainer = styled.div`
  ${Container} {
    margin-bottom: 10px;
    &:first-child {
      tbody {
        td {
          padding-bottom: 30px;
        }
      }
    }
  }

  .ant-row {
    margin-bottom: 10px;
  }
`;

export const LabelCol = styled(Col)`
  text-align: end;
  padding-right: 23px;
  color: ${(props) => props.theme.uiComponents.table.headerFontColor};
  font-size: 14px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.57;
  letter-spacing: normal;
`;
