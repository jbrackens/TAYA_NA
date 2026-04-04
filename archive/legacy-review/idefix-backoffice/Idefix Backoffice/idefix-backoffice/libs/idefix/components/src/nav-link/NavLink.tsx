import { FC } from "react";
import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";

const defaultStyle = {
  textDecoration: "none",
  color: "#fff",

  ":disabled": {
    pointerEvents: "none"
  }
};

interface Props extends NavLinkProps {
  disabled?: boolean;
  active?: boolean;
  themeMode: "light" | "dark";
}

const NavLink: FC<Props> = ({ children, disabled, active, themeMode, className, ...rest }) => {
  const styleActive = { ...defaultStyle, textDecoration: "underline" };
  return (
    <RouterNavLink style={({ isActive }) => (isActive || active ? styleActive : defaultStyle)} {...rest}>
      {children}
    </RouterNavLink>
  );
};

export { NavLink };
