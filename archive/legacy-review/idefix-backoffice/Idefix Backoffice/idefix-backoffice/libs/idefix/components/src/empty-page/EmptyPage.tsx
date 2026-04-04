import React, { FC } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

const EmptyPage: FC = () => {
  return (
    <Box display="flex" flexGrow={1} justifyContent="center" alignItems="center">
      <Box display="flex" flexDirection="column" alignItems="center">
        <PeopleAltIcon color="inherit" />
        <Typography color="inherit" style={{ marginTop: 8, fontWeight: 500, fontSize: "14px", lineHeight: "16px" }}>
          Nothing to see here
        </Typography>
        <Typography
          style={{
            marginTop: 8,
            textAlign: "center",
            fontWeight: "normal",
            fontSize: "14px",
            lineHeight: "16px"
          }}
        >
          Select user on sidebar <br></br> to see details
        </Typography>
      </Box>
    </Box>
  );
};

export { EmptyPage };
