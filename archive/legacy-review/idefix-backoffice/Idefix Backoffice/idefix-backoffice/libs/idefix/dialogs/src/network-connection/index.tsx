import React, { useEffect, useState } from "react";
import debounce from "lodash/debounce";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";

import { useWebSocket } from "@idefix-backoffice/shared/hooks";

const NetworkConnectionDialog = () => {
  const socket = useWebSocket();
  const [connected, setConnected] = useState<boolean>(true);

  const setDebouncedConnected = debounce(connected => setConnected(connected), 10000);

  useEffect(() => {
    socket.on("connect", () => setDebouncedConnected(true));
    socket.on("disconnect", () => setDebouncedConnected(false));
  }, [setDebouncedConnected, socket]);

  return (
    <Dialog open={!connected} transitionDuration={0}>
      <DialogTitle>No server connection</DialogTitle>
      <DialogContent>
        <Typography>Unable to connect to the server. Please check your network connection.</Typography>
      </DialogContent>
    </Dialog>
  );
};

export { NetworkConnectionDialog };
