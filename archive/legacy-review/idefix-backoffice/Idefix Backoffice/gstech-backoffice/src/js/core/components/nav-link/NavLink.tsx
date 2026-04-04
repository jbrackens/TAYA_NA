import React, { FC } from "react";
import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import cn from "classnames";

const useStyles = makeStyles(theme =>
  createStyles({
    root: {
      cursor: "pointer",
      color: theme.colors.black61,
      textDecoration: "none",

      "&:hover:not($disabled)": {
        color: theme.colors.blue,
      },
    },
    active: {
      color: theme.colors.blue,
    },
    disabled: {
      pointerEvents: "none",
      color: theme.colors.blackbd,
    },
  }),
);

interface Props extends NavLinkProps {
  isDisabled?: boolean;
  active?: boolean;
}

const NavLink: FC<Props> = ({ isDisabled, active, children, className, onClick, ...rest }) => {
  const classes = useStyles();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isDisabled) {
      event.preventDefault();
      event.stopPropagation();
    } else if (onClick) {
      onClick && onClick(event);
    }
  };

  return (
    <RouterNavLink
      onClick={handleClick}
      className={({ isActive }) =>
        cn(classes.root, className, {
          [classes.disabled]: isDisabled,
          [classes.active]: active || isActive,
        })
      }
      {...rest}
    >
      {children}
    </RouterNavLink>
  );
};

export { NavLink };
