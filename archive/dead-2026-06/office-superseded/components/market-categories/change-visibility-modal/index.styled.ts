import React from "react";
import { Alert } from "antd";

const classNames = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

const AlertComponent = Alert as React.ElementType;

export const ModalContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) =>
  React.createElement("span", {
    ...props,
    className: classNames("mr-[10px]", className),
  });

export const StyledAlert = ({
  className,
  ...props
}: React.ComponentProps<typeof Alert>) =>
  React.createElement(AlertComponent, {
    ...props,
    className: classNames("my-[10px]", className),
  });
