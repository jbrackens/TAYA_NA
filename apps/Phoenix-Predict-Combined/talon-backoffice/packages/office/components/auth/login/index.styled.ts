import React from "react";
import { Form } from "antd";
import type { FormItemProps } from "antd";

const classNames = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

export const LoginWrapper = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) =>
  React.createElement("div", {
    ...props,
    className: classNames(
      "flex h-full flex-row items-center justify-center",
      className,
    ),
  });

export const LoginFormComponent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) =>
  React.createElement("div", {
    ...props,
    className: classNames(
      "w-[32rem] rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] shadow-[0_12px_48px_rgba(26,26,26,0.06),0_1px_2px_rgba(26,26,26,0.04)]",
      className,
    ),
  });

export const LoginForm = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) =>
  React.createElement("div", {
    ...props,
    className: classNames("relative p-6", className),
  });

export const StyledA = ({
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
  React.createElement("a", {
    ...props,
    className: classNames("pl-7", className),
  });

export const StyledLabel = ({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) =>
  React.createElement("label", {
    ...props,
    className: classNames("pl-[7px]", className),
  });

export const FormItemWithSmallerMarginBottom = (({
  className,
  ...props
}: FormItemProps) =>
  React.createElement(Form.Item, {
    ...props,
    className: classNames("!mb-[5px]", className),
  })) as typeof Form.Item;
