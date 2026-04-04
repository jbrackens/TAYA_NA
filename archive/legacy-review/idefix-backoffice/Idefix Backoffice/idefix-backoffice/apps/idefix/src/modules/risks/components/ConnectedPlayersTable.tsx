import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import React, { ChangeEvent, FC, useCallback } from "react";

import {
  Column,
  ColumnProps,
  DownloadCsvButton,
  getCsvHeaders,
  getSearchByKeys,
  Search,
  Table
} from "@idefix-backoffice/idefix/components";
import { BrandInit, ConnectedPlayer, RiskProfile } from "@idefix-backoffice/idefix/types";
import { getFullBrandName, PLAYER_RISK_PROFILE } from "@idefix-backoffice/idefix/utils";
import { useSearch } from "@idefix-backoffice/shared/hooks";
import { MenuButton } from "./MenuButton";

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
    format: (riskProfile: RiskProfile) => PLAYER_RISK_PROFILE.find(({ value }) => value === riskProfile)!.label
  }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<ConnectedPlayer>(columns);

interface Props {
  brands: BrandInit[];
  connectedPlayers: ConnectedPlayer[];
  isConnectedPlayersLoading: boolean;
  onOpenConnectedPlayer: (id: number) => void;
  onAddPlayerConnection: () => void;
  onDisconnectPlayer: (id: number) => void;
}

const ConnectedPlayersTable: FC<Props> = ({
  brands,
  connectedPlayers,
  isConnectedPlayersLoading,
  onOpenConnectedPlayer,
  onAddPlayerConnection,
  onDisconnectPlayer
}) => {
  const { query, setQuery, results } = useSearch<ConnectedPlayer>(searchBy, connectedPlayers);
  const isEmpty = connectedPlayers.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
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

export { ConnectedPlayersTable };
