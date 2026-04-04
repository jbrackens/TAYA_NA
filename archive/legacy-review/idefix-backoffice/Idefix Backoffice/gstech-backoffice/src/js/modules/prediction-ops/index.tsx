import React from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";

export const PredictionOpsContainer = () => (
  <Box display="flex" flexGrow={1} p={3} bgcolor="#f5f7fa" height="calc(100vh - 49px)">
    <Paper elevation={0} style={{ width: "100%", border: "1px solid rgba(0,0,0,0.12)", padding: 24 }}>
      <Typography variant="h6">Prediction Ops</Typography>
      <Typography style={{ marginTop: 8, color: "rgba(0,0,0,0.64)" }}>
        Placeholder backoffice workspace for prediction-market operations.
      </Typography>

      <Box mt={3}>
        <Typography variant="subtitle2">Planned Panels</Typography>
        <Box mt={1}>
          <Typography variant="body2">1. Market Factory status and generation logs</Typography>
          <Typography variant="body2">2. Settlement source health and deterministic resolution trace</Typography>
          <Typography variant="body2">3. Bot API key issuance/audit and risk override history</Typography>
        </Box>
      </Box>
    </Paper>
  </Box>
);
