import * as React from "react";
import styled from "styled-components";
import { Payment } from "@brandserver-client/types";

const StyledHistoryTable = styled.table.attrs({
  cellSpacing: 0
})`
  width: 100%;
  margin-top: 50px;
  ${({ theme }) => theme.typography.text16};
  color: ${({ theme }) => theme.palette.contrastDark}};
  border-collapse: collapse;

  .history-table__row {
    height: 40px;
  }

  .history-table__column {
    vertical-align: middle;
    padding-left: 0px;
    padding-right: 16px;
    border-bottom: 1px solid ${({ theme }) => theme.palette.secondary};
  }

  .history-table__amount-column {
    ${({ theme }) => theme.typography.text16Bold};
    text-align: right;
  }
`;

interface IProps {
  payments: Payment[];
}

const HistoryTable: React.FC<IProps> = ({ payments }) => (
  <StyledHistoryTable>
    <tbody className="history-table__body">
      {payments.map(
        ({
          Amount,
          PaymentMethodName,
          Timestamp,
          TransactionTypeName,
          UniqueTransactionID
        }) => (
          <tr key={UniqueTransactionID} className="history-table__row">
            <td className="history-table__column">{Timestamp}</td>
            <td className="history-table__column">{PaymentMethodName}</td>
            <td className="history-table__column">{TransactionTypeName}</td>
            <td className="history-table__column history-table__amount-column">
              {Amount}
            </td>
          </tr>
        )
      )}
    </tbody>
  </StyledHistoryTable>
);

export default HistoryTable;
