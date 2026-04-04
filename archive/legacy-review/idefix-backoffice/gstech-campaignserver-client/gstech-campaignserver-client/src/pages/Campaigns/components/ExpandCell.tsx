import * as React from "react";
import { Campaign } from "app/types";
import { CellProps } from "react-table";
import { Arrow } from "../../../icons";

const ExpandCell: React.FC<CellProps<Campaign>> = ({ row }) => {
  const handleStopPropagation = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => e.stopPropagation(),
    []
  );

  return row.subRows?.length > 1 ? (
    <div onClick={handleStopPropagation}>
      <div {...row.getToggleRowExpandedProps()} style={{ display: "flex" }}>
        {row.isExpanded ? <Arrow /> : <Arrow style={{ transform: "rotate(180deg)" }} />}
      </div>
    </div>
  ) : null;
};

export { ExpandCell };
