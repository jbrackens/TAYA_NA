import React from "react";

export const SPORT_ICON_SIZE = 24;

const classNames = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

const SPORT_ICON_CLASS_NAME = [
  "inline-flex",
  "h-6",
  "w-6",
  "overflow-hidden",
  "rounded-[0.33rem]",
  "border",
  "border-transparent",
  "bg-[var(--surface-1)]",
  "[&+span]:-ml-2",
  "[&+span]:border-[rgba(0,0,0,0.15)]",
  "[&_img]:h-6",
  "[&_img]:w-6",
  "[&_img]:-mt-px",
  "[&_img]:-ml-px",
].join(" ");

export const SportIconStyled = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) =>
  React.createElement("span", {
    ...props,
    className: classNames(SPORT_ICON_CLASS_NAME, className),
  });
