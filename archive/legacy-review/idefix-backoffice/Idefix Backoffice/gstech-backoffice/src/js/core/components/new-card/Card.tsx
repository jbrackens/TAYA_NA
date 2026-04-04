import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import { CardProps } from "@material-ui/core/Card";
import Typography from "@material-ui/core/Typography";

const useStyles = makeStyles({
  card: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    height: "100%",
    minWidth: 205,
  },
  CardContent: {
    flexGrow: 1,
    paddingBottom: "0 !important",
    padding: 0,
  },
  title: {
    fontWeight: "normal",
    fontSize: "12px",
    lineHeight: "16px",
    color: "#4054B2",
  },
  subtitle: {
    fontWeight: 900,
    fontSize: "20px",
    lineHeight: "28px",
    color: "#4054B2",
  },
  label: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 8,
    fontWeight: "normal",
    fontSize: "14px",
    lineHeight: "16px",
    color: "rgba(28,32,41,0.64)",

    "&:first-child": {
      marginTop: 0,
    },
  },
  value: {
    fontWeight: "normal",
    fontSize: "14px",
    lineHeight: "16px",
    color: "#1C2029",
  },
  progressBar: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexGrow: 1,
    paddingBottom: "0 !important",
    padding: 0,
    paddingLeft: 35,
  },
  progressBarText: {
    maxWidth: 212,
    textAlign: "center",
    fontWeight: "normal",
    fontSize: "12px",
    lineHeight: "16px",
    color: "rgba(28,32,41,0.64)",
  },
});

interface Props extends CardProps {
  subtitle?: string | number;
  textInfo: { label: string; value: string | number }[];
  ratio?: number;
  customStyle?: React.CSSProperties;
}

export default (props: Props) => {
  const classes = useStyles();
  const { title, subtitle, textInfo, ratio, customStyle, ...rest } = props;

  return (
    <Box className={classes.card} {...rest}>
      <Box className={classes.CardContent}>
        <Typography className={classes.title}>{title}</Typography>
        <Typography className={classes.subtitle}>{subtitle}</Typography>
        <Box mt={3} style={customStyle}>
          {textInfo &&
            textInfo.map(({ label, value }, index) => (
              <Typography key={`${label}${index}`} className={classes.label}>
                {label}
                <Typography component="span" className={classes.value}>
                  {value}
                </Typography>
              </Typography>
            ))}
        </Box>
      </Box>
    </Box>
  );
};
