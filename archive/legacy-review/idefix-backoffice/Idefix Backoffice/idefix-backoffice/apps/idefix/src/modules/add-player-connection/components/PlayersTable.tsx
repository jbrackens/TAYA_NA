import React from "react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";

import { appSlice, useAppSelector } from "@idefix-backoffice/idefix/store";
import { getFullBrandName } from "@idefix-backoffice/idefix/utils";

const columns = [{ key: "fullName" }, { key: "email" }, { key: "brandId", align: "right" }];

const changeCssProperty = (property?: "left" | "center" | "right") => {
  let result;

  switch (property) {
    case "left":
      result = "flex-start";
      break;
    case "center":
      result = "center";
      break;
    case "right":
      result = "flex-end";
      break;
    default:
      result = property;
  }

  return result;
};

const RowRenderer = (props: ListChildComponentProps) => {
  const {
    data: { players, columns, selectedPlayers, onCheck },
    style,
    index
  } = props;
  const player = players[index];
  const brands = useAppSelector(appSlice.getBrands);

  return (
    <Box
      key={index}
      sx={{ ...style, display: "flex", alignItems: "center", borderBottom: "1px solid rgba(28, 32, 41, 0.08)" }}
    >
      <Checkbox color="primary" checked={selectedPlayers?.includes(player.id)} onChange={() => onCheck(player.id)} />
      {columns.map(
        (
          column: {
            key: string;
            align?: "left" | "center" | "right";
          },
          index: number
        ) => {
          const brandId = player[column.key];
          const align = changeCssProperty(column.align);

          return (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: `${align}`,
                flex: "1 1",
                padding: "4px 6px",
                fontWeight: "normal",
                fontSize: "14px",
                lineHeight: "16px",
                textOverflow: "ellipsis",
                overflow: "hidden"
              }}
            >
              {getFullBrandName(brandId, brands)}
            </Box>
          );
        }
      )}
    </Box>
  );
};

interface PlayersTableProps {
  players: {
    fullName: string;
    id: number;
    email: string;
    brandId: string;
  }[];
  selectedPlayers: number[];
  onCheck: (newId: number) => void;
}

const PlayersTable = ({ players, selectedPlayers, onCheck }: PlayersTableProps) => (
  <Box display="flex" flexDirection="column" width="672px" height="400px">
    <AutoSizer>
      {({ height, width }) => (
        <List
          itemData={{ players, columns, selectedPlayers, onCheck }}
          itemCount={players.length}
          height={height}
          width={width}
          itemSize={56}
        >
          {RowRenderer}
        </List>
      )}
    </AutoSizer>
  </Box>
);
export default PlayersTable;
