import React, { ChangeEvent, useCallback } from "react";
import { useSelector } from "react-redux";
import { ConnectedPlayer, RiskProfile } from "app/types";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import { getBrands } from "../../app";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";
import useSearch from "../../../core/hooks/useSearch";
import { PLAYER_RISK_PROFILE } from "../../../core/constants";
import { getFullBrandName } from "../../../core/helpers";
import { MenuButton } from "./MenuButton";
import Button from "@material-ui/core/Button";

const columns = [
  { label: "First Name", name: "firstName", align: "left", type: "text" },
  { label: "Last Name", name: "lastName", align: "left", type: "text" },
  { label: "Email", name: "email", align: "left", type: "text", style: { minWidth: 250 } },
  { label: "Deposits", name: "totalDepositAmount", align: "left", type: "text" },
  {
    label: "Risk Profile",
    name: "riskProfile",
    align: "left",
    type: "custom",
    format: (riskProfile: RiskProfile) => PLAYER_RISK_PROFILE.find(({ value }) => value === riskProfile)!.label,
  },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<ConnectedPlayer>(columns);

interface Props {
  connectedPlayers: ConnectedPlayer[];
  isConnectedPlayersLoading: boolean;
  onOpenConnectedPlayer: (id: number) => void;
  onAddPlayerConnection: () => void;
  onDisconnectPlayer: (id: number) => void;
}

export default ({
  connectedPlayers,
  isConnectedPlayersLoading,
  onOpenConnectedPlayer,
  onAddPlayerConnection,
  onDisconnectPlayer,
}: Props) => {
  const brands = useSelector(getBrands);
  const { query, setQuery, results } = useSearch<ConnectedPlayer>(searchBy, connectedPlayers);
  const isEmpty = connectedPlayers.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Connected Accounts</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={
          <>
            <Button onClick={() => onAddPlayerConnection()}>Add Player Connection</Button>
            <DownloadCsvButton
              headers={CSV_HEADERS}
              data={results}
              disabled={isEmpty}
              fileName="connected_accounts.csv"
            />
          </>
        }
      />
      <Table initialData={results} isLoading={isConnectedPlayersLoading}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
        <Column
          label="Brand"
          name="brandId"
          align="left"
          type="custom"
          format={(brandId: string) => getFullBrandName(brandId, brands)}
        />
        <Column
          label="Actions"
          name="actions"
          align="right"
          type="custom"
          format={(_: unknown, row: ConnectedPlayer) => (
            <MenuButton
              row={row}
              onOpenConnectedPlayer={onOpenConnectedPlayer}
              onDisconnectPlayer={onDisconnectPlayer}
            />
          )}
        />
      </Table>
    </Box>
  );
};
