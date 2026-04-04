import React, { FC, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import cn from "classnames";
import Box from "@material-ui/core/Box";
import Card from "@material-ui/core/Card";
import CardActionArea from "@material-ui/core/CardActionArea";
import CardContent from "@material-ui/core/CardContent";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import { createStyles, makeStyles } from "@material-ui/core/styles";

const useCardStyles = makeStyles(theme =>
  createStyles({
    card: {
      background: "transparent",
      boxShadow: "none",
      display: "flex",
      marginLeft: -1,
    },
    mobileCard: {
      [theme.breakpoints.between("xs", "sm")]: {
        width: "100%",
      },
    },
    cardAreaVisible: {
      background: theme.colors.blackf5,
      "& svg": {
        color: theme.colors.blue,
      },
      "& $divider": {
        background: "none",
      },
    },
    hoverEffect: {
      "&:hover svg": {
        color: theme.colors.blue,
      },
      "&:hover $divider": {
        background: "none",
      },
    },
    label: {
      textTransform: "capitalize",
      fontSize: 12,
      lineHeight: "16px",
      color: theme.colors.black75,
    },
    text: {
      fontSize: 14,
      lineHeight: "24px",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    },
    divider: {
      width: 1,
      height: "calc(100% - 32px)",
      alignSelf: "center",
      background: theme.colors.blacke0,
    },
  }),
);
const TOOLTIP_TEXT = "Click to copy";

interface Props {
  label: string;
  className?: string;
  children: string | number;
}

const TooltipCard: FC<Props> = ({ label, className, children }) => {
  const classes = useCardStyles();
  const [tooltip, setTooltip] = useState<string>(TOOLTIP_TEXT);

  return (
    <CopyToClipboard text={String(children)} onCopy={() => setTooltip("Copied")}>
      <Tooltip title={tooltip} placement="bottom-start" onClose={() => setTooltip(TOOLTIP_TEXT)}>
        <Card className={cn(classes.card, classes.hoverEffect, classes.mobileCard)}>
          <Box className={classes.divider} />
          <CardActionArea
            classes={{
              focusVisible: classes.cardAreaVisible,
            }}
          >
            <CardContent>
              <Typography className={classes.label} variant="subtitle1" component="span">
                {label}
              </Typography>
              <Typography component="div" className={cn(classes.text, className)}>
                {children}
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Tooltip>
    </CopyToClipboard>
  );
};

export default TooltipCard;
