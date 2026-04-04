import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Box from "@material-ui/core/Box";
import Popover from "@material-ui/core/Popover";
import Typography from "@material-ui/core/Typography";
import InfoIcon from "@material-ui/icons/InfoOutlined";
import IconButton from "@material-ui/core/IconButton";
import { PaymentEvent } from "app/types";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import { DownloadCsvButton } from "../../../core/components/button";
import Search from "../../../core/components/search";
import useSearch from "../../../core/hooks/useSearch";
import { fetchPaymentTransactionsEventLogs, getPaymentsState } from "../paymentsSlice";

const columns = [
  {
    label: "Timestamp",
    name: "timestamp",
    align: "left",
    type: "date",
    style: { minWidth: 138 },
  },
  {
    label: "Status",
    name: "status",
    align: "left",
    type: "text",
    style: { minWidth: 124 },
  },
  {
    label: "User",
    name: "handle",
    align: "left",
    type: "text",
    style: { minWidth: 124 },
  },
  {
    label: "Message",
    name: "message",
    align: "right",
    type: "text",
    style: { minWidth: 400 },
  },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<PaymentEvent>(columns);

interface Props {
  transactionKey: string;
  paymentId: number;
  transactionId: number;
}

const AdditionalInfo = ({ transactionKey, paymentId, transactionId }: Props) => {
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
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
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
  const dispatch = useDispatch();
  const params = useParams();
  const { isFetchingTransactionsEventLogs, eventLogs } = useSelector(getPaymentsState);
  const { query, setQuery, results } = useSearch<PaymentEvent>(searchBy, eventLogs);

  const isEmpty = eventLogs.length === 0;
  const playerId = Number(params.playerId);

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  useEffect(() => {
    dispatch(fetchPaymentTransactionsEventLogs({ playerId, paymentId }));
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
      <Table initialData={results} isLoading={isFetchingTransactionsEventLogs} displayRows={6}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
      </Table>
    </>
  );
};

export default AdditionalInfo;
