import { makeStyles } from "@mui/styles";

export const useStyles = makeStyles({
  playerDetailsForm: {
    display: "flex",
    position: "relative"
  },
  playerDetailsColumn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    paddingRight: 24
  },
  playerDetailsSell: {
    marginBottom: 16
  }
});
