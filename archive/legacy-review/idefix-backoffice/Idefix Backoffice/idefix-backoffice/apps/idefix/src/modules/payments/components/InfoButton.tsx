import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import InfoIcon from "@mui/icons-material/InfoOutlined";

import { PaymentEvent } from "@idefix-backoffice/idefix/types";
import {
  Table,
  Column,
  ColumnProps,
  getCsvHeaders,
  getSearchByKeys,
  Search,
  DownloadCsvButton
} from "@idefix-backoffice/idefix/components";
import { useSearch } from "@idefix-backoffice/shared/hooks";
import { paymentsSlice, useAppDispatch, useAppSelector } from "@idefix-backoffice/idefix/store";

const columns = [
  {
    label: "Timestamp",
    name: "timestamp",
    align: "left",
    type: "date",
    style: { minWidth: 138 }
  },
  {
    label: "Status",
    name: "status",
    align: "left",
    type: "text",
    style: { minWidth: 124 }
  },
  {
    label: "User",
    name: "handle",
    align: "left",
    type: "text",
    style: { minWidth: 124 }
  },
  {
    label: "Message",
    name: "message",
    align: "right",
    type: "text",
    style: { minWidth: 400 }
  }
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<PaymentEvent>(columns);

interface Props {
  transactionKey: string;
  paymentId: number;
  transactionId: number;
}

const InfoButton = ({ transactionKey, paymentId, transactionId }: Props) => {
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);

  const handleClick = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <div>
      <IconButton onClick={handleClick}>
        <InfoIcon />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right"
        }}
      >
        <Box p={3}>
          {Boolean(anchorEl) && (
            <EventsTable transactionId={transactionId} transactionKey={transactionKey} paymentId={paymentId} />
          )}
        </Box>
      </Popover>
    </div>
  );
};

interface TableProps {
  transactionKey: string;
  paymentId: number;
  transactionId: number;
}

const EventsTable: FC<TableProps> = ({ transactionKey, paymentId, transactionId }) => {
  const dispatch = useAppDispatch();
  const params = useParams<{ playerId: string }>();
  const eventLogs = useAppSelector(paymentsSlice.getEvents);
  const isLoading = useAppSelector(paymentsSlice.getIsLoadingEvents);
  const { query, setQuery, results } = useSearch<PaymentEvent>(searchBy, eventLogs);

  const isEmpty = eventLogs.length === 0;
  const playerId = Number(params.playerId);

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  useEffect(() => {
    dispatch(paymentsSlice.fetchPaymentTransactionsEventLogs({ playerId, paymentId }));
  }, [dispatch, paymentId, playerId]);

  return (
    <>
      <Typography variant="subtitle2">{`Payment: ${paymentId} Transaction: ${transactionId} (${transactionKey})`}</Typography>
      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search"
        disabled={isEmpty}
        buttons={<DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="export.csv" />}
      />
      <Table initialData={results} isLoading={isLoading} displayRows={6}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </>
  );
};

export { InfoButton };
