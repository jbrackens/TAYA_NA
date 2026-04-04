import * as React from "react";
import { useDrag, useDrop, DropTargetMonitor } from "react-dnd";
import styled from "styled-components";
import cn from "classnames";
import { Row } from "react-table";

import { DragnDrop } from "../../icons";
import { Cell } from "./Cell";

const StyledRow = styled.div`
  &:hover {
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.24);
  }

  .drag-icon {
    display: flex;
    justify-content: center;
    width: 24px;
    visibility: hidden;
  }

  &:hover .drag-icon {
    visibility: visible;
  }
`;

const DND_ITEM_TYPE = "row";

interface DragItem {
  index: number;
  id: string;
  type: string;
}

interface Props<ObjectType extends object> {
  index: number;
  row: Row<ObjectType>;
  style: React.CSSProperties;
  onDrop: (index: number) => void;
  onRowClick: (row: Row<ObjectType>) => void;
  onMoveRow: (dragIndex: number, hoverIndex: number) => void;
  dimmed: boolean;
}

function DraggableRow<ObjectType extends object>({
  row,
  index,
  style,
  onMoveRow,
  onDrop,
  onRowClick,
  dimmed
}: React.PropsWithChildren<Props<ObjectType>>) {
  const dropRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<HTMLSpanElement>(null);

  const [, drop] = useDrop(() => ({
    accept: DND_ITEM_TYPE,
    hover(item: DragItem, monitor: DropTargetMonitor) {
      if (!dropRef.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      // Determine rectangle on screen
      const hoverBoundingRect = dropRef.current?.getBoundingClientRect();
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      // Time to actually perform the action
      // onMoveRow(dragIndex, hoverIndex, item, monitor);
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      onMoveRow(dragIndex, hoverIndex);

      item.index = hoverIndex;
    },
    drop(item) {
      onDrop(item.index);
    }
  }));

  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: DND_ITEM_TYPE,
    item: { type: DND_ITEM_TYPE, index },
    collect: monitor => ({
      isDragging: monitor.isDragging()
    })
  }));

  const opacity = isDragging ? 0 : 1;
  const isDimmed = dimmed !== undefined && dimmed;

  preview(drop(dropRef));
  drag(dragRef);

  return (
    <StyledRow
      ref={dropRef}
      style={{ opacity }}
      className={cn("table-body__row")}
      onClick={() => onRowClick(row)}
      {...row.getRowProps({
        style
      })}
    >
      <span ref={dragRef} className="drag-icon">
        <DragnDrop />
      </span>
      {row.cells.map((cell, index) => (
        <Cell cell={cell} key={`${cell.row.id}-${index}`} isDimmed={isDimmed} />
      ))}
    </StyledRow>
  );
}

export { DraggableRow };
