import { FC, Fragment } from "react";
import { useSelector } from "react-redux";
import Drawer from "@material-ui/core/Drawer";
import Box from "@material-ui/core/Box";
import Divider from "@material-ui/core/Divider";
import Avatar from "@material-ui/core/Avatar";
import Typography from "@material-ui/core/Typography";
import format from "date-fns/format";
import isEmpty from "lodash/fp/isEmpty";
import { getIsTicketLoading, getTicket } from "../transactionsSlice";
import TooltipCard from "../../../core/components/tooltip-card/ToolTipCard";
import { getPlayer } from "../../player";
import CircularProgress from "@material-ui/core/CircularProgress";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TransactionDrawer: FC<Props> = ({ open, onClose }) => {
  const { info: playerInfo } = useSelector(getPlayer);
  const ticket = useSelector(getTicket);
  const isLoading = useSelector(getIsTicketLoading);

  const betId = ticket?.id;
  const ticketContent = ticket?.content;
  const bets = ticketContent?.bets;

  const content = (
    <>
      <Box display="flex" mb={2}>
        <Avatar src={`/images/logos/${playerInfo?.brandId}@2x.png`} />
        <Box display="flex" flexDirection="column" ml={2}>
          <Typography variant="caption">
            {playerInfo?.brandId}_{playerInfo?.id}
          </Typography>
          <Typography>
            {playerInfo?.firstName} {playerInfo?.lastName}
          </Typography>
        </Box>
      </Box>

      {!isEmpty(ticket) ? (
        <Box display="flex" flexDirection="column">
          <TooltipCard label="Bet ID">{betId!}</TooltipCard>
          <TooltipCard label="Status">{ticketContent?.status || "Empty"}</TooltipCard>
          <TooltipCard label="Stake">{`${ticketContent?.stake?.totalAmount} €` || "Empty"}</TooltipCard>
          <TooltipCard label="Won Amount">{`${ticketContent?.wonAmount?.amount} €` || "Empty"}</TooltipCard>
          <TooltipCard label="Purchase Date">
            {ticketContent?.date ? format(new Date(ticketContent?.date), "dd.MM.yyyy HH:mm") : "Empty"}
          </TooltipCard>
          {bets?.map(bet => {
            return (
              <Fragment key={bet.id}>
                <TooltipCard label="Total Odds">{bet.totalOdds}</TooltipCard>
                <Divider variant="fullWidth" />
                {bet.selections.map(selection => (
                  <Fragment key={selection.id}>
                    <TooltipCard label="Selection">{selection.event.tournamentName}</TooltipCard>
                    <TooltipCard label="Sport">{selection.event.sportName}</TooltipCard>
                    <TooltipCard label="Odd">{selection.odds}</TooltipCard>
                    <TooltipCard label="Won">{String(selection.won)}</TooltipCard>
                    <TooltipCard label="Bet Settled Date">
                      {format(new Date(selection.event.dateStart), "dd.MM.yyyy HH:mm")}
                    </TooltipCard>
                    <TooltipCard label="Market">{selection.outcome.marketName}</TooltipCard>
                  </Fragment>
                ))}
              </Fragment>
            );
          })}
        </Box>
      ) : (
        <Typography align="center">Empty</Typography>
      )}
    </>
  );

  return (
    <Drawer open={open} onClose={onClose} anchor="right">
      <Box width={420} p={2}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" width={1} height="200px">
            <CircularProgress size={60} thickness={5} />
          </Box>
        ) : (
          content
        )}
      </Box>
    </Drawer>
  );
};

export { TransactionDrawer };
