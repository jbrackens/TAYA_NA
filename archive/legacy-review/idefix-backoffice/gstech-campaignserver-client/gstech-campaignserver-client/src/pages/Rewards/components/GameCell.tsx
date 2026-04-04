import * as React from "react";
import styled from "styled-components";
import { Cell } from "react-table";

import { RewardWithOrder } from "../types";

const StyledGameCell = styled.div`
  & > :last-child {
    color: ${({ theme }) => theme.palette.blackMiddle};
  }
`;

interface IProps {
  cell: Cell<RewardWithOrder>;
}

const GameCell: React.FC<IProps> = ({ cell }) => {
  const { permalink, manufacturer } = cell.row.original;

  return (
    <StyledGameCell>
      <p>{permalink}</p>
      <p className="text-small-reg">{manufacturer}</p>
    </StyledGameCell>
  );
};

export { GameCell };
