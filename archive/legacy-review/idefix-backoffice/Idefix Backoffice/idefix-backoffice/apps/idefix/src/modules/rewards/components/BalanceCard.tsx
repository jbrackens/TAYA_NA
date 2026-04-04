import React, { useCallback, useState, MouseEvent, FC } from "react";
import map from "lodash/map";
import capitalize from "lodash/fp/capitalize";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";

interface CoinsProps {
  title: string;
  total: string;
  credited: string;
  used: string;
}

const Coins: FC<CoinsProps> = ({ title, total, credited, used }) => {
  const [anchorEl, setAnchorEl] = useState<(EventTarget & HTMLDivElement) | null>(null);
  const open = Boolean(anchorEl);

  const handlePopoverOpen = useCallback((event: MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handlePopoverClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <Box>
      <Box
        display="flex"
        flexDirection="column"
        style={{ cursor: "pointer" }}
        aria-haspopup="true"
        onClick={open ? handlePopoverClose : handlePopoverOpen}
      >
        <Typography sx={{ fontSize: "12px", lineHeight: "16px" }} color="primary">
          {capitalize(title)} Coins
        </Typography>
        <Typography sx={{ fontSize: "20px", fontWeight: "bold", lineHeight: "28px" }}>{total}</Typography>
      </Box>
      <Popover
        sx={{ padding: "16px" }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left"
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <Box width="142px">
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
              fontWeight: "bold",

              "& > :first-child": {
                fontWeight: "normal",
                opacity: 0.64
              }
            }}
          >
            <Typography>Credited</Typography>
            <Typography>{credited}</Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
              fontWeight: "bold",

              "& > :first-child": {
                fontWeight: "normal",
                opacity: 0.64
              }
            }}
          >
            <Typography>Used</Typography>
            <Typography>{used}</Typography>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

interface BalanceCardProps {
  balance: any;
  isLoading: boolean;
}

const BalanceCard: FC<BalanceCardProps> = ({ balance, isLoading }) => {
  return (
    <Box sx={{ padding: "24px", width: "100%" }}>
      <Typography sx={{ fontSize: "16px", fontWeight: "bold", lineHeight: "24px" }}>Balance</Typography>
      <Box
        display="flex"
        sx={{
          display: "flex",
          marginTop: "8px",
          "& > :not(:first-child)": {
            marginLeft: "24px"
          }
        }}
      >
        {isLoading
          ? "Loading..."
          : map(balance, (balance, key) => (
              <Coins key={key} title={key} total={balance.total} credited={balance.credited} used={balance.used} />
            ))}
      </Box>
    </Box>
  );
};

export { BalanceCard };
