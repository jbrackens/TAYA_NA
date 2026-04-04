import { createStyles, makeStyles } from "@material-ui/core/styles";

const useSearchStyles = makeStyles(theme =>
  createStyles({
    search: { display: "flex", alignItems: "center" },
    searchInput: {
      width: "100%",
      fontSize: 14,
      lineHeight: "normal",
      margin: "18px auto 18px 0",
      color: theme.colors.black21,
      "& .MuiSvgIcon-root": {
        width: "1em",
        height: "1em",
        color: theme.colors.black61,
      },
    },
    buttons: {
      display: "flex",
      margin: "auto 0",
      marginLeft: 8,
      "& button:not(:first-child)": {
        marginLeft: 8,
      },
      "& a:not(:first-child)": {
        marginLeft: 8,
      },
      "& div:not(:first-child)": {
        marginLeft: 8,
      },
    },
  }),
);

export { useSearchStyles };
