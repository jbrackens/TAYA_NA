import React, { FC } from "react";
import moment from "moment-timezone";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import { makeStyles } from "@material-ui/styles";
import { Link } from "react-router-dom";
import { PlayerEvent } from "app/types";
import { marked } from "marked";
import Loading from "../../../core/components/Loading";
import { Typography } from "@material-ui/core";

const useStyles = makeStyles({
  event: {
    display: "flex",
    alignItems: "center",
    fontSize: 15,
    color: "rgba(0, 0, 0, 0.87)",
    minHeight: "56px",
    padding: "6px 0",
    borderBottom: "1px solid #cccccc66",
  },
  eventBlock: {
    minWidth: 250,
    marginRight: 8,
  },
  eventDate: {
    flexShrink: 0,
    marginRight: 8,
    fontWeight: "bold",
  },
  eventContent: {
    display: "flex",
    alignItems: "flex-start",
  },
  eventNote: {
    fontSize: 14,
    color: "#000",
    fontWeight: 500,
    "& > h1, h2, h3, h4, p, ul, ol, blockquote": {
      marginTop: 0,
      marginBottom: 0,
    },
  },
  action: {
    marginLeft: "auto",
  },
});

interface Props {
  events: PlayerEvent[];
  isFetchingNotes?: boolean;
  userId?: number;
  playerId?: number;
  onArchiveNote?: (id: number) => void;
}

const Events: FC<Props> = ({ events, isFetchingNotes, userId, onArchiveNote, playerId }) => {
  const classes = useStyles();

  if (isFetchingNotes) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100px">
        <Loading />
      </Box>
    );
  }

  return (
    <Box>
      {events.length === 0 && (
        <Box display="flex" justifyContent="center" p={3}>
          <Typography variant="body2">Log is empty</Typography>
        </Box>
      )}
      {events.map(event => (
        <Box key={event.id} className={classes.event}>
          <Box className={classes.eventBlock}>
            <Box component="span" className={classes.eventDate}>
              {moment(event.createdAt).format("DD.MM.YYYY HH:mm:ss")}
            </Box>
            {`<${event.handle || "System"}>`}
          </Box>
          <Box mr={2}>
            {event.title}
            {!!event.content && (
              <Box className={classes.eventNote} dangerouslySetInnerHTML={{ __html: marked(event.content) }} />
            )}
          </Box>
          {event.type === "fraud" && event.details && event.details.fraudId && (
            <Button
              className={classes.action}
              component={Link}
              to={`/players/@${playerId}/tasks/fraud/${event.details.fraudId}`}
            >
              Open
            </Button>
          )}
          {event.type === "note" && event.userId === userId && onArchiveNote && (
            <Button className={classes.action} onClick={() => onArchiveNote(event.id)}>
              Archive
            </Button>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default Events;
