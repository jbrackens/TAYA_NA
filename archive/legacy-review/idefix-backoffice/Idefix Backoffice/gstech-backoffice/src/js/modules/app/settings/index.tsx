import React from "react";
import Box from "@material-ui/core/Box";

export default (props: { children: React.ReactNode }) => (
  <Box display="flex" flexGrow={1} height="calc(100vh - 49px)">
    <Box display="flex" alignItems="stretch" flexGrow={1} height="100%">
      {props.children}
    </Box>
  </Box>
);
