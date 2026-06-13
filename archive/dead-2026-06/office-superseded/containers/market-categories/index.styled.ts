import type { HTMLAttributes } from "react";
import React from "react";

const classNames = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return React.createElement("div", {
    ...props,
    className: classNames("flex flex-col [&>span]:mb-2.5", className),
  });
}
