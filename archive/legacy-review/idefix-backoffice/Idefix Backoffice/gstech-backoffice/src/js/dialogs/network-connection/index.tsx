import React, { useEffect, useState } from "react";
import debounce from "lodash/debounce";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import Typography from "@material-ui/core/Typography";
import * as Socket from "../../core/websocket";

const NetworkConnectionDialog = () => {
  const [connected, setConnected] = useState<boolean>(true);

  const setDebouncedConnected = debounce(connected => setConnected(connected), 10000);

  useEffect(() => {
    Socket.on("connect", () => setDebouncedConnected(true));
    Socket.on("disconnect", () => setDebouncedConnected(false));
  }, [setDebouncedConnected]);

  return (
    <Dialog open={!connected} transitionDuration={0}>
      <DialogTitle>No server connection</DialogTitle>
      <DialogContent>
        <Typography>Unable to connect to the server. Please check your network connection.</Typography>
      </DialogContent>
    </Dialog>
  );
};

export default NetworkConnectionDialog;
