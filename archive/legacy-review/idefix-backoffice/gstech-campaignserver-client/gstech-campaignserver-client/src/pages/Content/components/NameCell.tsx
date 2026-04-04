import * as React from "react";
import styled from "styled-components";
import { Cell } from "react-table";

import { Checkbox } from "../../../components";

const StyledNameCell = styled.div`
  display: flex;
  align-items: center;
  .name-cell {
    width: 90%;
    & > :first-child {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    & > :last-child {
      color: ${({ theme }) => theme.palette.blackMiddle};
    }
  }

  > * {
    margin-left: 10px;
  }
`;

interface IProps {
  cell: Cell<any>;
}

const NameCell: React.FC<IProps> = ({ cell }) => {
  const { title, name } = cell.row.original;

  return (
    <StyledNameCell>
      <Checkbox />
      <div className="name-cell">
        <p className="text-main-med">{title}</p>
        <p className="text-small-reg">{name}</p>
      </div>
    </StyledNameCell>
  );
};

export { NameCell };
