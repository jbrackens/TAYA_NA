import React from "react";
import { Button } from "antd";

const classNames = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

const ButtonComponent = Button as React.ElementType;

export const MoreButton = ({
  className,
  ...props
}: React.ComponentProps<typeof Button>) =>
  React.createElement(ButtonComponent, {
    ...props,
    className: classNames("!px-2", className),
  });
