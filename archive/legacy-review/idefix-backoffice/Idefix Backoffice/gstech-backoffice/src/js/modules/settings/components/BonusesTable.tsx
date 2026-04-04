import React, { ChangeEvent, useCallback, useState } from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import { Bonus } from "app/types";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";

const MenuActions = ({
  row,
  onEditBonus,
  onArchive,
}: {
  row: Bonus;
  onEditBonus: (bonus: Bonus) => void;
  onArchive: (id: number, settingsType: string) => void;
}) => {
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);

  const handleClick = (event: React.MouseEvent) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton aria-controls="simple-menu" aria-haspopup="true" edge="end" onClick={handleClick}>
        <MoreVertIcon />
      </IconButton>
      <Menu id="simple-menu" anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={() => onEditBonus(row)}>Edit</MenuItem>
        <MenuItem onClick={() => onArchive(row.id, "bonuses")}>Archive</MenuItem>
      </Menu>
    </>
  );
};

const columns = [
  { label: "ID", name: "id", align: "left", type: "text" },
  { label: "Name", name: "name", align: "left", type: "text", style: { minWidth: 182 } },
  {
    label: "Wagering Requirement",
    name: "wageringRequirementMultiplier",
    align: "left",
    type: "text",
    style: { minWidth: 182 },
  },
  {
    label: "Days until expiration",
    name: "daysUntilExpiration",
    align: "left",
    type: "text",
    style: { minWidth: 182 },
  },
  { label: "Credit once", name: "creditOnce", align: "left", type: "boolean" },
  { label: "Deposit bonus", name: "depositBonus", align: "left", type: "boolean" },
  {
    label: "Deposit #",
    name: "depositCount",
    align: "left",
    type: "custom",
    format: (value: string, { depositCountMatch }: { depositCountMatch: string }) =>
      depositCountMatch || !value ? value : `${value}+`,
  },
  { label: "Deposit match %", name: "depositMatchPercentage", align: "left", type: "text" },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<Bonus>(columns);

interface Props {
  items: Bonus[];
  isLoading: boolean;
  onEditBonus: (bonus: Bonus) => void;
  onArchive: (id: number, settingsType: string) => void;
}

export default ({ items, isLoading, onEditBonus, onArchive }: Props) => {
  const filteredItems = items.filter(item => !item.archived);
  const { query, setQuery, results } = useSearch<Bonus>(searchBy, filteredItems);
  const isEmpty = filteredItems.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Game Manufacturers</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={<DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="bonuses.csv" />}
      />
      <Table initialData={results} isLoading={isLoading} displayRows={12}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
        <Column
          label="Actions"
          name="actions"
          align="right"
          type="custom"
          format={(_: unknown, bonus: Bonus) => (
            <MenuActions row={bonus} onEditBonus={onEditBonus} onArchive={onArchive} />
          )}
          style={{ maxWidth: 98 }}
        />
      </Table>
    </Box>
  );
};
