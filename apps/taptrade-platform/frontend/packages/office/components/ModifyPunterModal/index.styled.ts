import React from "react";
import { Form } from "antd";
import type { FormItemProps } from "antd";

const classNames = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

export const CustomFormItem = ({ className, ...props }: FormItemProps) =>
  React.createElement(Form.Item, {
    ...props,
    className: classNames("mt-5 text-right [&_button]:ml-[10px]", className),
  });

type FormFieldWrapperProps = {
  $horizontalLayout: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export const FormFieldWrapper = ({
  $horizontalLayout,
  className,
  ...props
}: FormFieldWrapperProps) =>
  React.createElement("div", {
    ...props,
    className: classNames(
      $horizontalLayout ? "flex [&_.ant-form-item]:mr-[10px]" : "block",
      "[&_.ant-form-item]:grow",
      className,
    ),
  });

export const ErrorMessageDiv = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) =>
  React.createElement("div", {
    ...props,
    className: classNames("float-left text-[var(--no-text)]", className),
  });
