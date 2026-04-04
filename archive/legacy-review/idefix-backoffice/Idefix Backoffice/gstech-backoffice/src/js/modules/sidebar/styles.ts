import { createStyles, makeStyles } from "@material-ui/core/styles";

export const useStyles = makeStyles(theme =>
  createStyles({
    container: {
      position: "relative",
    },
    root: {
      minHeight: "60px",

      "& .MuiListItemText-multiline, & .MuiListItemText-root": {
        marginTop: 0,
        marginBottom: 0,
      },
    },

    avatar: {
      position: "relative",
      marginRight: 8,
      width: 24,
      height: 24,
      overflow: "visible",
    },
    playerOnline: {
      position: "relative",

      "&::after": {
        content: "''",
        position: "absolute",
        bottom: -4,
        right: -4,
        display: "block",
        width: 12,
        height: 12,
        backgroundColor: "#4CAF50",
        border: "2px solid #fff",
        borderRadius: "50%",
      },
    },
    playerName: {
      display: "flex",
      alignItems: "center",
      fontWeight: 500,
      fontSize: "14px",
      lineHeight: "24px",
    },
    playerSubText: {
      fontWeight: 500,
      fontSize: "12px",
      lineHeight: "16px",
      color: "#616161",
    },
    timeHasPassed: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 4,
      fontWeight: "normal",
      fontSize: "12px",
      lineHeight: "16px",
      color: "rgba(0, 0, 0, 0.87)",
    },
    indicator: {
      position: "absolute",
      top: 0,
      right: 0,
      width: 4,
      height: "100%",
      background: "#2d3d6d",
      borderRadius: "4px 0px 0px 4px",
    },
    iconButton: {
      position: "absolute",
      top: "translateY(-50%)",
      right: 16,
      width: 20,
      height: 20,
      color: "#bdbdbd",

      "&:hover": {
        color: "#616161",
      },
    },
    playerTimer: {},
    closedAccount: {
      opacity: 0.48,
    },
    lockIcon: {
      width: 20,
      height: 20,
      marginLeft: 4,
      padding: 4,
      color: "#9e9e9e",
      backgroundColor: "#eee",
      borderRadius: "50%",
    },
    lockedBy: {
      display: "inline-flex",
      alignItems: "center",
      color: "#4054B2",
      fontSize: "12px",
      lineHeight: "16px",
    },
    eyeIcon: {
      marginRight: 4.5,
      width: 12,
      height: 12,
    },
    pendingWd: {
      marginLeft: 4,
      padding: "2px 6px",
      backgroundColor: "#FFEBEE",
      borderRadius: "10px",
      color: "#F2453D",
      fontWeight: 500,
      fontSize: "12px",
      lineHeight: "16px",
    },
    autoWd: {
      fontWeight: 500,
      fontSize: "inherit",
      lineHeight: "inherit",
      color: "#ff9800",
    },
    autoWdTimer: {
      fontWeight: "inherit",
      fontSize: "inherit",
      lineHeight: "inherit",
      background: "rgba(255, 152, 0, 0.2)",
      borderRadius: "2px",
      padding: "0px 4px",
    },
    divider: {
      marginLeft: 48,
    },
    blinker: {
      animation: "$blink 1s ease-in 1s 5",
    },
    "@keyframes blink": {
      "0%": {
        opacity: 1,
      },
      "50%": {
        opacity: 0.4,
      },
      "100%": {
        opacity: 1,
      },
    },
  }),
);
