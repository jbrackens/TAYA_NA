import React from "react";
import { makeStyles } from "@material-ui/styles";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import { Link } from "react-router-dom";

const useStyles = makeStyles({
  container: {
    width: "100%",
    height: "calc(100vh - 48px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",

    "& > a": {
      marginTop: "18px",
    },
  },
});

const NotFound = () => {
  const classes = useStyles();

  return (
    <Box className={classes.container}>
      <Typography variant="h2">Page not found</Typography>
      <Button component={Link} to="/" color="primary">
        Return Home
      </Button>
    </Box>
  );
};

export default NotFound;
