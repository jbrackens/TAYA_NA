import React from "react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { makeStyles } from "@material-ui/styles";
import Box from "@material-ui/core/Box";
import Checkbox from "@material-ui/core/Checkbox";
import { getFullBrandName } from "../../../core/helpers";
import { useSelector } from "react-redux";
import { getBrands } from "../../app";

const useStyles = makeStyles({
  row: {
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid rgba(28, 32, 41, 0.08)",
  },
  data: {
    display: "flex",
    alignItems: "center",
    flex: "1 1",
    padding: "4px 6px",
    fontWeight: "normal",
    fontSize: "14px",
    lineHeight: "16px",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
});

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
    index,
  } = props;
  const player = players[index];
  const classes = useStyles();
  const brands = useSelector(getBrands);

  return (
    <Box key={index} style={style} className={classes.row}>
      <Checkbox color="primary" checked={selectedPlayers?.includes(player.id)} onChange={() => onCheck(player.id)} />
      {columns.map(
        (
          column: {
            key: string;
            align?: "left" | "center" | "right";
          },
          index: number,
        ) => {
          const brandId = player[column.key];
          const align = changeCssProperty(column.align);

          return (
            <Box key={index} className={classes.data} style={{ justifyContent: `${align}` }}>
              {getFullBrandName(brandId, brands)}
            </Box>
          );
        },
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
