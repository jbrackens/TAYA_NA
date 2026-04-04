import * as React from "react";
import styled from "styled-components";
import { Cell } from "react-table";
import { Game } from "app/types";

const StyledNameCell = styled.div`
  & > :last-child {
    color: ${({ theme }) => theme.palette.blackMiddle};
  }
`;

interface IProps {
  cell: Cell<Game>;
}

const NameCell: React.FC<IProps> = ({ cell }) => {
  const { name, permalink } = cell.row.original;

  return (
    <StyledNameCell>
      <p className="text-main-med">{name}</p>
      <p className="text-small-reg">{permalink}</p>
    </StyledNameCell>
  );
};

export { NameCell };
