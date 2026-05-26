import React from "react";
import { Button } from "antd";

const classNames = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

const ButtonComponent = Button as React.ElementType;

export const ActionButtonContainer = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) =>
  React.createElement("div", {
    ...props,
    className: classNames(
      "[&_button]:w-full [&_button:first-child]:mb-[5px]",
      className,
    ),
  });

export const CancelButton = ({
  className,
  ...props
}: React.ComponentProps<typeof Button>) =>
  React.createElement(ButtonComponent, {
    ...props,
    className: classNames("ml-[10px]", className),
  });
