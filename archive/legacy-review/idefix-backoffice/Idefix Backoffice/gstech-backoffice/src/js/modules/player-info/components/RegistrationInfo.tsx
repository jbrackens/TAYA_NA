import React, { memo } from "react";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import { makeStyles } from "@material-ui/styles";
import Loading from "../../../core/components/Loading";
import { PlayerRegistrationInfo } from "app/types";
import { Theme } from "@material-ui/core";
import TooltipCard from "../../../core/components/tooltip-card/ToolTipCard";

const useStyles = makeStyles((theme: Theme) => ({
  paper: {
    padding: theme.spacing(3),
    height: "100%",
  },
  column: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    width: "50%",

    "& > :not(:first-child)": {
      marginTop: theme.spacing(2),
    },
  },
  label: {
    color: theme.colors.blackDark,
  },
  textValue: {
    marginTop: "4px",
    color: theme.colors.black,
    wordWrap: "break-word",
  },
  emptyValue: {
    ...theme.typography.h3,
    color: theme.colors.blackMiddle,
  },
}));

interface Props {
  isLoading: boolean;
  registrationInfo: PlayerRegistrationInfo;
}

const RegistrationInfo = ({ isLoading, registrationInfo }: Props) => {
  const classes = useStyles();

  const infoText = (label = "", text = "") => {
    return <TooltipCard label={label}>{text ?? "Empty"}</TooltipCard>;
  };

  return (
    <>
      <Box>
        <Typography variant="subtitle2">Registration Info</Typography>
      </Box>
      {isLoading || !registrationInfo ? (
        <Box display="flex" justifyContent="center">
          <Loading size={60} thickness={5} />
        </Box>
      ) : (
        <Box display="flex" mt={3}>
          <Box className={classes.column} pr={1}>
            {infoText("Affiliate", registrationInfo.affiliateName)}
            {infoText("Affiliate Registration Code", registrationInfo.affiliateRegistrationCode)}
          </Box>
          <Box className={classes.column} pl={1}>
            {infoText("Registration IP", registrationInfo.registrationIP)}
            {infoText("Registration Country", registrationInfo.registrationCountry)}
          </Box>
          <Box className={classes.column} pl={1}>
            {infoText("Registration Time", registrationInfo.registrationTime)}
            {infoText("Last Login Time", registrationInfo.lastLogin)}
          </Box>
        </Box>
      )}
    </>
  );
};

export default memo(RegistrationInfo);
