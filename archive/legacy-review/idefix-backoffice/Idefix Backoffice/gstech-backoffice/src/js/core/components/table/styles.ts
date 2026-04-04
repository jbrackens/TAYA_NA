import { createStyles, makeStyles } from "@material-ui/core/styles";

export const useTableStyles = makeStyles(theme =>
  createStyles({
    tableWrapper: {
      height: "100%",
      width: "100%",
      overflowX: "auto",
      background: theme.colors.white,
      [theme.breakpoints.down("md")]: {
        maxWidth: "calc(100vw - 32px)",
        overflowY: "hidden",
      },
    },
    table: {
      height: "100%",
      [theme.breakpoints.down("md")]: {
        width: 1280,
        minWidth: 960,
      },
    },
    checkbox: {
      padding: "0 4px !important",
      display: "flex",
      flexBasis: "40px !important",
      flex: "inherit",
      justifyContent: "center",
      alignItems: "center",
    },
    withAction: {
      cursor: "pointer",
    },
    negativeValue: {
      color: `${theme.colors.red} !important`,
    },
    sortIcon: {
      position: "absolute",
      right: -20,
      width: 16,
      height: 16,
    },

    notFoundContainer: {
      display: "block",
      width: "100%",
      padding: 16,
      border: "none",
    },
    notFound: {
      fontSize: 20,
      lineHeight: "28px",
      color: theme.colors.black75,
    },
    notFoundText: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: "16px",
      color: theme.colors.black75,
    },

    loadingContainer: {
      display: "block",
      width: "100%",
      padding: 16,
      border: "none",
    },
    loadingText: {
      fontSize: 20,
      lineHeight: "28px",
      color: theme.colors.black75,
    },
    loadingDescription: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: "16px",
      color: theme.colors.black75,
    },

    infScrollLoadingContainer: {
      position: "absolute",
      zIndex: 1,
      backgroundColor: "#fff",
      display: "box",
      width: "100%",
      padding: 16,
      border: "none",
      boxShadow: "0px 4px 3px -3px rgba(33, 33, 33, 0.2)",
    },
  }),
);

export const useTotalStyles = makeStyles(theme =>
  createStyles({
    container: {
      display: "flex",
      justifyContent: "flex-end",
      padding: 16,
      [theme.breakpoints.down("sm")]: {
        justifyContent: "flex-start",
      },
    },
    value: {
      marginLeft: 8,
    },
    negativeValue: {
      color: theme.colors.red,
    },
  }),
);

export const useSummaryStyles = makeStyles(theme =>
  createStyles({
    container: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      padding: 16,
      [theme.breakpoints.down("md")]: {
        alignItems: "flex-start",
      },
    },
    row: {
      display: "flex",
      justifyContent: "space-between",
      [theme.breakpoints.down("md")]: {
        padding: 0,
        width: "calc(100vw - 64px)",
      },
    },
    label: {
      fontSize: 14,
      lineHeight: "24px",
      fontWeight: 500,
    },
    value: {
      marginLeft: 8,
      fontSize: 14,
      lineHeight: "24px",
      fontWeight: 500,
      [theme.breakpoints.down("md")]: {
        marginLeft: 4,
      },
    },
    dividedRow: {
      paddingTop: 8,
      flexDirection: "column",
    },
    revenue: {
      marginLeft: 8,
    },
    divider: {
      width: "100%",
      margin: "16px 0",
    },
    negativeValue: {
      color: theme.colors.red,
    },
  }),
);

export const useSkeletonStyles = makeStyles(theme =>
  createStyles({
    tableWrapper: {
      marginTop: 2,
      width: "100%",
      [theme.breakpoints.down("md")]: {
        maxWidth: "calc(100vw - 32px)",
        overflowX: "auto",
        overflowY: "hidden",
      },
    },
    table: {
      width: "100%",
      height: "100%",
      [theme.breakpoints.down("md")]: {
        width: 960,
        minWidth: 960,
      },
    },
    tableRow: {
      padding: "0 16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: `1px solid ${theme.colors.blacke0}`,
      "&:first-child": {
        borderBottomWidth: 2,
      },
      "&:last-child": {
        borderBottom: "none",
      },
    },
    total: {
      display: "flex",
      justifyContent: "flex-end",
      marginTop: 24,
      marginRight: 16,
      [theme.breakpoints.down("md")]: {
        marginLeft: 16,
        justifyContent: "flex-start",
      },
    },
  }),
);
