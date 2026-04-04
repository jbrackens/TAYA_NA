import React, { ReactNode } from "react";
import { Card, CardActions, CardContent, CardHeader, CardHeaderProps, CardProps } from "@material-ui/core";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/styles";
import Box from "@material-ui/core/Box";
import cn from "classnames";

const useStyles = makeStyles(() => ({
  card: {
    width: "100%",
    height: "100%",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  cardTitle: {
    fontSize: "15px",
  },
  cardSubheader: {
    fontSize: "12px",
  },
  container: {
    display: "flex",
    flexDirection: "column",
  },
  containerColumns: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  cardActions: {
    marginLeft: 8,
  },
}));

interface ICardProps extends CardProps {
  isLoading?: boolean;
  columns?: boolean;
  actions?: ReactNode;
  overflow?: boolean;
  headerAction?: CardHeaderProps["action"];
  subHeader?: CardHeaderProps["subheader"];
}

export default ({
  title,
  isLoading,
  columns,
  children,
  actions,
  headerAction,
  subHeader,
  className,
  overflow,
  ...props
}: ICardProps) => {
  const classes = useStyles();

  return (
    <Card {...props} classes={{ root: classes.card }}>
      {title && (
        <CardHeader
          title={title}
          subheader={subHeader ? subHeader : null}
          action={headerAction ? headerAction : null}
          classes={{ title: classes.cardTitle, subheader: classes.cardSubheader }}
        />
      )}
      <CardContent
        classes={{
          root: columns ? cn(classes.containerColumns, className) : cn(classes.container, className),
        }}
        style={{ overflowY: overflow ? "auto" : undefined }}
      >
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" width={1} height="200px">
            <CircularProgress size={60} thickness={5} />
          </Box>
        ) : (
          children
        )}
      </CardContent>
      {actions && <CardActions className={classes.cardActions}>{actions}</CardActions>}
    </Card>
  );
};
