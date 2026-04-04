import React, { useCallback, useMemo, useState } from "react";
import map from "lodash/map";
import capitalize from "lodash/fp/capitalize";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Popover from "@material-ui/core/Popover";
import Typography from "@material-ui/core/Typography";

const useStyles1 = makeStyles(theme => ({
  paper: {
    padding: "16px",
  },
  title: {
    fontSize: "12px",
    lineHeight: "16px",
    color: theme.colors.blue,
  },
  subtitle: {
    fontSize: "20px",
    fontWeight: "bold",
    lineHeight: "28px",
    color: theme.colors.blue,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    fontWeight: "bold",

    "& > :first-child": {
      fontWeight: "normal",
      color: theme.colors.black,
      opacity: 0.64,
    },
  },
}));

interface Props {
  title: string;
  total: string;
  credited: string;
  used: string;
}

const Coins = ({ title, total, credited, used }: Props) => {
  const classes = useStyles1();

  const [anchorEl, setAnchorEl] = useState(null);

  const handlePopoverOpen = useCallback(event => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handlePopoverClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const open = useMemo(() => Boolean(anchorEl), [anchorEl]);

  return (
    <Box>
      <Box
        display="flex"
        flexDirection="column"
        style={{ cursor: "pointer" }}
        aria-haspopup="true"
        onClick={open ? handlePopoverClose : handlePopoverOpen}
      >
        <Typography className={classes.title}>{capitalize(title)} Coins</Typography>
        <Typography className={classes.subtitle}>{total}</Typography>
      </Box>
      <Popover
        classes={{
          paper: classes.paper,
        }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <Box width="142px">
          <Box className={classes.row}>
            <Typography>Credited</Typography>
            <Typography>{credited}</Typography>
          </Box>
          <Box className={classes.row}>
            <Typography>Used</Typography>
            <Typography>{used}</Typography>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

const useStyles2 = makeStyles({
  root: {
    padding: "24px",
    width: "100%",
  },
  title: {
    fontSize: "16px",
    fontWeight: "bold",
    lineHeight: "24px",
  },
  coins: {
    marginTop: "8px",
    "& > :not(:first-child)": {
      marginLeft: "24px",
    },
  },
});

const BalanceCard = ({ balance }: any) => {
  const classes = useStyles2();

  return (
    <Box className={classes.root}>
      <Typography className={classes.title}>Balance</Typography>
      <Box display="flex" className={classes.coins}>
        {map(balance, (balance, key) => (
          <Coins key={key} title={key} total={balance.total} credited={balance.credited} used={balance.used} />
        ))}
      </Box>
    </Box>
  );
};

export default BalanceCard;
