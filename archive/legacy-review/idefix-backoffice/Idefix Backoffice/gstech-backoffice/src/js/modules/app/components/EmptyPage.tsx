import React from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";

const Icon = () => {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M24 10C20.71 10 18 12.71 18 16C18 19.29 20.71 22 24 22C27.29 22 30 19.29 30 16C30 12.71 27.29 10 24 10ZM10 14C8.93913 14 7.92172 14.4214 7.17157 15.1716C6.42143 15.9217 6 16.9391 6 18C6 19.0609 6.42143 20.0783 7.17157 20.8284C7.92172 21.5786 8.93913 22 10 22C11.0609 22 12.0783 21.5786 12.8284 20.8284C13.5786 20.0783 14 19.0609 14 18C14 16.9391 13.5786 15.9217 12.8284 15.1716C12.0783 14.4214 11.0609 14 10 14ZM38 14C36.9391 14 35.9217 14.4214 35.1716 15.1716C34.4214 15.9217 34 16.9391 34 18C34 19.0609 34.4214 20.0783 35.1716 20.8284C35.9217 21.5786 36.9391 22 38 22C39.0609 22 40.0783 21.5786 40.8284 20.8284C41.5786 20.0783 42 19.0609 42 18C42 16.9391 41.5786 15.9217 40.8284 15.1716C40.0783 14.4214 39.0609 14 38 14ZM10 26C5.63 26 2 27.8176 2 30.4336V34H8V32.4336C8 29.9236 9.05397 27.7549 10.918 26.0469C10.614 26.0289 10.314 26 10 26ZM24 26C16.936 26 12 28.6456 12 32.4336V38H36V32.4336C36 28.6456 31.064 26 24 26ZM38 26C37.686 26 37.386 26.0289 37.082 26.0469C38.946 27.7549 40 29.9256 40 32.4336V34H46V30.4336C46 27.8176 42.37 26 38 26Z"
        fill="#1C2029"
        fillOpacity="0.32"
      />
    </svg>
  );
};

export default () => (
  <Box display="flex" flexGrow={1} justifyContent="center" alignItems="center">
    <Box display="flex" flexDirection="column" alignItems="center">
      <Icon />
      <Typography style={{ marginTop: 8, fontWeight: 500, fontSize: "14px", lineHeight: "16px", color: "#1C2029" }}>
        Nothing to see here
      </Typography>
      <Typography
        style={{
          marginTop: 8,
          textAlign: "center",
          fontWeight: "normal",
          fontSize: "14px",
          lineHeight: "16px",
          color: "rgba(28, 32, 41, 0.32)",
        }}
      >
        Select user on sidebar <br></br> to see details
      </Typography>
    </Box>
  </Box>
);
