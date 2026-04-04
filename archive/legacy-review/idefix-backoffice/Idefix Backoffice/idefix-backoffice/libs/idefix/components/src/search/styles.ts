import { makeStyles } from "@mui/styles";

const useSearchStyles = makeStyles(theme => ({
  search: { display: "flex", alignItems: "center" },
  searchInput: {
    width: "100%",
    fontSize: 14,
    lineHeight: "normal",
    margin: "18px auto 18px 0",
    "& .MuiSvgIcon-root": {
      width: "1em",
      height: "1em"
    }
  },
  buttons: {
    display: "flex",
    margin: "auto 0",
    marginLeft: 8,
    "& button:not(:first-child)": {
      marginLeft: 8
    },
    "& a:not(:first-child)": {
      marginLeft: 8
    },
    "& div:not(:first-child)": {
      marginLeft: 8
    }
  }
}));

export { useSearchStyles };
