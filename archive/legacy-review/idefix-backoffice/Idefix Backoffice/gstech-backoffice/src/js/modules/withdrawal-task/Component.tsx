import React, { ChangeEvent } from "react";
import moment from "moment-timezone";
import Box from "@material-ui/core/Box";
import TextField from "@material-ui/core/TextField";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormHelperText from "@material-ui/core/FormHelperText";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import Button from "@material-ui/core/Button";
import { Events } from "../history-and-notes";
import validate from "./validate";
import { PlayerEvent, WithdrawalEvent, WithdrawalWithOptions } from "app/types";
import { Typography } from "@material-ui/core";
import Divider from "@material-ui/core/Divider";
import { Link } from "react-router-dom";
import TooltipCard from "../../core/components/tooltip-card/ToolTipCard";
import Loading from "../../core/components/Loading";
import { EventsTable } from "./components/EventsTable";

interface Props {
  playerId: string | undefined;
  isFetchingWithdrawals: boolean;
  withdrawal: WithdrawalWithOptions | null;
  isFetchingNotes: boolean;
  notes: PlayerEvent[];
  isFetchingEvents: boolean;
  events: WithdrawalEvent[];
  userId: number;
  values: {
    paymentProviderId: number | null;
    amount: string;
    staticId: number | null;
  };
  onChangeValue: (key: string, value: string) => void;
  onAccept: () => void;
  onAcceptWithDelay: () => void;
  onCloseWithdrawal: () => void;
  delay: string | null;
}

export default ({
  playerId,
  isFetchingWithdrawals,
  withdrawal,
  isFetchingNotes,
  notes,
  isFetchingEvents,
  events,
  userId,
  values,
  onChangeValue,
  onAccept,
  onAcceptWithDelay,
  onCloseWithdrawal,
  delay,
}: Props) => {
  const { isValid, errors } = validate(withdrawal, values);

  const lastEvent = events[events.length - 1];
  const shouldDisableAcceptingWD = events?.length && lastEvent.status === "accepted";
  const canAcceptWithDelay = withdrawal?.canAcceptWithDelay;

  const actions = () => (
    <Box display="flex" mt={2}>
      <Box>
        <Button
          key="accept-now"
          disabled={!isValid || (!!shouldDisableAcceptingWD && lastEvent?.userId === userId)}
          color="primary"
          onClick={onAccept}
        >
          Accept now
        </Button>
      </Box>
      <Box ml={1}>
        <Button
          disabled={
            !isValid || (!!shouldDisableAcceptingWD && lastEvent?.userId === userId) || !canAcceptWithDelay || !!delay
          }
          color="primary"
          onClick={onAcceptWithDelay}
        >
          Accept with delay
        </Button>
      </Box>
      <Box display="flex" alignItems="center" ml={1}>
        <Button
          disabled={!isValid || (!!shouldDisableAcceptingWD && lastEvent?.userId === userId)}
          color="default"
          onClick={onCloseWithdrawal}
        >
          Cancel WD
        </Button>
        {delay && (
          <Box ml={1} color="#FF9800">
            WD will be automatically accepted in{" "}
            <Box
              component="span"
              style={{ background: "rgba(255, 152, 0, 0.2)", borderRadius: "2px", padding: "0px 4px" }}
            >
              {delay}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Box p={3}>
      <Typography variant="subtitle2">Process Withdrawal</Typography>
      <Box title="Process withdrawal">
        {isFetchingWithdrawals ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100px">
            <Loading />
          </Box>
        ) : (
          <Box display="flex" mt={3}>
            <TooltipCard label="Requested amount">{withdrawal?.formattedAmount || "Empty"}</TooltipCard>
            <TooltipCard label="Requested">
              {moment(withdrawal?.timestamp).format("DD.MM.YYYY HH.mm.ss") || "Empty"}
            </TooltipCard>
            <TooltipCard label="Player account">
              {withdrawal?.paymentMethod ? `${withdrawal?.paymentMethod?.name} ${withdrawal?.account}` : "Empty"}
            </TooltipCard>
          </Box>
        )}
      </Box>

      <Box mt={3}>
        <Divider variant="fullWidth" />
      </Box>

      {withdrawal?.paymentProviders && withdrawal.paymentProviders.length > 0 ? (
        <Box mt={3}>
          <Typography variant="body2">
            {!!shouldDisableAcceptingWD &&
              lastEvent.userId === userId &&
              "This payment is was already accepted by you and requires a confirmation from another user."}
          </Typography>
          <Box display="flex" mt={2}>
            <Box minWidth="150px">
              <FormControl disabled={!!shouldDisableAcceptingWD} fullWidth>
                <InputLabel>Payment provider</InputLabel>
                <Select
                  label="Payment provider"
                  value={values.paymentProviderId}
                  onChange={(e: ChangeEvent<{ value: unknown }>) =>
                    onChangeValue("paymentProviderId", e.target.value as string)
                  }
                >
                  {withdrawal.paymentProviders.map(({ id, name }) => (
                    <MenuItem key={id} value={id}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{errors.paymentProviderId}</FormHelperText>
              </FormControl>
            </Box>
            <Box ml={1}>
              <TextField
                label="Amount"
                value={values.amount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onChangeValue("amount", e.target.value)}
                disabled={!!shouldDisableAcceptingWD}
                helperText={errors.amount}
              />
            </Box>
          </Box>
          {actions()}
        </Box>
      ) : (
        <Box mt={3}>
          <Box>
            <Typography variant="body2">
              This withdrawal can't be processed through any payment provider.{" "}
              <Link to={`/players/@${playerId}/payments`}>Please check account</Link>.
            </Typography>
          </Box>
        </Box>
      )}

      <Box mt={3}>
        <Divider variant="fullWidth" />
      </Box>

      <Box mt={3}>
        <Typography variant="subtitle2">Player notes</Typography>
        <Box style={{ maxHeight: "400px", overflowY: "auto" }}>
          <Events events={notes} isFetchingNotes={isFetchingNotes} />
        </Box>
      </Box>

      <Box mt={3}>
        <Divider variant="fullWidth" />
      </Box>

      <Box mt={3} paddingBottom={12}>
        <Box display="flex" flexDirection="column" minHeight="250px">
          <EventsTable events={events} isLoading={isFetchingEvents} />
        </Box>
      </Box>
    </Box>
  );
};
