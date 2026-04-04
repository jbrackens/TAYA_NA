import * as React from "react";
import styled from "styled-components";
import { CellProps } from "react-table";
import { Campaign } from "app/types";

import { Label } from "../../../components";
import { Folder } from "../../../icons";

const StyledTableNameCell = styled.div`
  display: flex;
  align-items: center;
  p {
    margin: 0 8px;

    &:hover {
      cursor: pointer;
    }
  }

  .icon {
    margin-left: 8px;
    margin-right: 8px;
    width: 20px;
    height: 20px;
  }

  .border {
    margin-left: 16px;
    width: 2px;
    height: 64px;
    border-left: 2px solid ${({ theme }) => theme.palette.blackLight};
  }
`;

const NameCell: React.FC<CellProps<Campaign>> = ({ cell, value }) => {
  const { status, previewMode } = cell.row.original;
  const isGroup = cell.row.subRows?.length >= 1;
  const isChild = cell.row.depth !== 0;
  const campaignsLength = cell.row.subRows?.length;

  const isRunning = status === "running";
  const isDraft = status === "draft";

  return (
    <StyledTableNameCell>
      {/*<Checkbox />*/}
      {isGroup && <Folder className="icon" />}
      {isGroup && <span className="">({campaignsLength})</span>}

      {isChild && <div className="border" />}
      <p className="text-header-small cell__title">{value}</p>
      {isRunning && <Label color="green">Running</Label>}
      {isDraft && previewMode && <Label color="gray">Preview Mode</Label>}
    </StyledTableNameCell>
  );
};

export { NameCell };
