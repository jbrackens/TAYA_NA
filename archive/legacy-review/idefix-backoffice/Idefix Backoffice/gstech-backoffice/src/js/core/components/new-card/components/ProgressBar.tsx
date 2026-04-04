import React from "react";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import WarningIcon from "./warning-icon";
import isNumber from "lodash/isNumber";

const useStyles = makeStyles(theme => ({
  icon: {
    position: "absolute",
    left: "50%",
    top: "20%",
    transform: "translateX(-50%)",
  },
  text: {
    position: "absolute",
    left: "50%",
    top: "23%",
    transform: "translateX(-50%)",
    fontSize: "12px",
    color: theme.colors.blackMiddle,
    whiteSpace: "nowrap",
  },
}));

const getLevelText = (value: number) => {
  switch (true) {
    case value <= 30:
      return "Low";
    case value > 30 && value <= 70:
      return "Medium";
    case value > 70:
      return "High";
    default:
      return "";
  }
};

const ProgressBar = ({ value, withText = false }: { value: number; withText?: boolean }) => {
  const classes = useStyles();

  return (
    <Box position="relative">
      {withText ? (
        <Typography className={classes.text}>{getLevelText(value)}</Typography>
      ) : (
        <Box className={classes.icon}>{value >= 100 ? <WarningIcon /> : null}</Box>
      )}
      <CircularProgressbar
        value={value || 0}
        text={isNumber(value) ? `${Math.round(value)}%` : ""}
        circleRatio={0.6}
        styles={buildStyles({
          rotation: 7 / 10,
          strokeLinecap: "round",
          textColor: "#1C2029",
          textSize: "20px",
          trailColor: "rgba(255,152,0, 0.08)",
          pathColor: "rgba(255,152,0)",
        })}
      />
    </Box>
  );
};

export default ProgressBar;
