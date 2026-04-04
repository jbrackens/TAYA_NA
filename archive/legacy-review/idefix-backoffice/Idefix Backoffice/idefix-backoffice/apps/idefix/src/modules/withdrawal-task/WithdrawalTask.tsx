import { ChangeEvent, FC } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import Typography from "@mui/material/Typography";
import InputLabel from "@mui/material/InputLabel";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import { Divider, FormHelperText, MenuItem } from "@mui/material";

import { TooltipCard } from "@idefix-backoffice/shared/ui";
import { useWithdrawalTask } from "./hooks";
import { validate } from "./validation";
import { EventsTable } from "./components/EventsTable";
import { HistoryTable } from "../history/components/HistoryTable";
import { LoadingIndicator } from "@idefix-backoffice/idefix/components";

const WithdrawalTask: FC = () => {
  const {
    playerId,
    withdrawal,
    isLoadingWithdrawal,
    notes,
    isLoadingNotes,
    events,
    isLoadingEvents,
    values,
    userId,
    delay,
    handleAccept,
    handleAcceptWithDelay,
    handleCloseWithdrawal,
    handleChange
  } = useWithdrawalTask();

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
          onClick={handleAccept}
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
          onClick={handleAcceptWithDelay}
        >
          Accept with delay
        </Button>
      </Box>
      <Box display="flex" alignItems="center" ml={1}>
        <Button
          disabled={!isValid || (!!shouldDisableAcceptingWD && lastEvent?.userId === userId)}
          onClick={handleCloseWithdrawal}
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
    <Box>
      <Typography variant="subtitle2">Process Withdrawal</Typography>
      <Box title="Process withdrawal">
        {isLoadingWithdrawal ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100px">
            <LoadingIndicator />
          </Box>
        ) : (
          <Box display="flex" mt={3}>
            <TooltipCard label="Requested amount">{withdrawal?.formattedAmount || "Empty"}</TooltipCard>
            <TooltipCard label="Requested">
              {withdrawal?.timestamp ? format(new Date(withdrawal.timestamp), "dd.MM.yyyy HH:mm:ss") : "Empty"}
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
                  onChange={(e: SelectChangeEvent<number | null>) =>
                    handleChange("paymentProviderId", e.target.value as string)
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
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("amount", e.target.value)}
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
              <Link to={`/players/${playerId}/payments`}>Please check account</Link>.
            </Typography>
          </Box>
        </Box>
      )}

      <Box mt={3}>
        <Divider variant="fullWidth" />
      </Box>

      <Box mt={3}>
        <Box style={{ maxHeight: "400px", overflowY: "auto" }}>
          <HistoryTable events={notes} isLoading={isLoadingNotes} playerId={playerId} userId={userId} />
        </Box>
      </Box>

      <Box mt={3} paddingBottom={12}>
        <Box display="flex" flexDirection="column" minHeight="250px">
          <EventsTable events={events} isLoading={isLoadingEvents} />
        </Box>
      </Box>
    </Box>
  );
};

export { WithdrawalTask };
