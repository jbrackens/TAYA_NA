import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import { FC, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { marked } from "marked";

import { PlayerEvent } from "@idefix-backoffice/idefix/types";

interface Props {
  event: PlayerEvent;
  playerId: number;
  userId: number | undefined;
  onArchiveNote?: (id: number) => () => void;
}

const Actions: FC<Props> = ({ event, playerId, userId, onArchiveNote }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);
  const id = open ? "popover" : undefined;

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  if (event.type === "fraud") {
    return (
      <Button component={Link} to={`/players/${playerId}/tasks/fraud/${event.details["fraudId"]}`}>
        Open
      </Button>
    );
  }

  if (event.type === "note") {
    return (
      <Box display="flex">
        <Button aria-describedby={id} onClick={handleClick}>
          Show
        </Button>
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left"
          }}
        >
          <Box sx={{ maxWidth: "512px", p: 1 }} dangerouslySetInnerHTML={{ __html: marked(event.content) }} />
        </Popover>
        {event.userId === userId && onArchiveNote && (
          <Button sx={{ marginLeft: 1 }} onClick={onArchiveNote(event.id)}>
            Archive
          </Button>
        )}
      </Box>
    );
  }

  return null;
};

export { Actions };
