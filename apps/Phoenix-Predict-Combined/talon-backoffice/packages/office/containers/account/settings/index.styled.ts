import { Descriptions } from "antd";
import type { ComponentProps } from "react";
import React from "react";

const classNames = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

export function DescriptionsContainer({
  className,
  ...props
}: ComponentProps<typeof Descriptions>) {
  return React.createElement(Descriptions, {
    ...props,
    className: classNames(
      "[&_.ant-descriptions-item-label]:flex [&_.ant-descriptions-item-label]:items-center",
      className,
    ),
  });
}
