import React from "react";
import { Row } from "antd";

const classNames = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

const RowComponent = Row as React.ElementType;

export const ErrorRow = ({
  className,
  ...props
}: React.ComponentProps<typeof Row>) =>
  React.createElement(RowComponent, {
    ...props,
    className: classNames("mb-[10px]", className),
  });
