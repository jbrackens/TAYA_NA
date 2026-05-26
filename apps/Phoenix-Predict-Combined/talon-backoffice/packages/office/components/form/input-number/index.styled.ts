import React from "react";
import { InputNumber as AntdInputNumber } from "antd";

const classNames = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

export const InputNumberStyled = ({
  className,
  ...props
}: React.ComponentProps<typeof AntdInputNumber>) =>
  React.createElement(AntdInputNumber, {
    ...props,
    className: classNames("w-full", className),
  });
